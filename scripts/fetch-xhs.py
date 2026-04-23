#!/usr/bin/env python3
"""
通过 Chrome CDP 获取小红书笔记内容（支持图文和视频）。
需要 debug Chrome 已用 ~/.chrome-debug-profile 登录过小红书。
用法: python3 fetch-xhs.py <url>
"""
import sys, json, time, re, os, tempfile, subprocess
import requests
import websocket

# 使用国内镜像下载 Whisper 模型（避免 HuggingFace 连接问题）
os.environ.setdefault('HF_ENDPOINT', 'https://hf-mirror.com')

CDP_URL = 'http://127.0.0.1:9222'
CONTENT_TIMEOUT = 20   # 等待页面内容最多 20 秒
VIDEO_TIMEOUT = 10     # 等待视频 URL 出现最多 10 秒
WHISPER_MODEL = 'base'  # tiny/base/small/medium，越大越准但越慢


# ─── CDP helpers ──────────────────────────────────────────────────────────────

def get_ws_url():
    r = requests.get(f'{CDP_URL}/json/version', timeout=5)
    return r.json()['webSocketDebuggerUrl']

def extract_note_id(url):
    for pattern in [
        r'/explore/([a-f0-9]{24})',
        r'/discovery/item/([a-f0-9]{24})',
        r'noteId=([a-f0-9]{24})',
    ]:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    return None


# ─── Video transcription ──────────────────────────────────────────────────────

def transcribe_video_url(video_url: str, title: str = '') -> str | None:
    """下载视频，提取音频，用 faster-whisper 转录。"""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None

    tmp_dir = tempfile.mkdtemp(prefix='xhs-video-')
    mp4_path = os.path.join(tmp_dir, 'video.mp4')
    wav_path = os.path.join(tmp_dir, 'audio.wav')

    try:
        # 下载视频（小红书直链无需额外 cookie）
        r = requests.get(video_url, timeout=60, stream=True)
        r.raise_for_status()
        with open(mp4_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=1024 * 256):
                f.write(chunk)

        # 提取音频（单声道 16kHz，Whisper 标准输入格式）
        subprocess.run(
            ['ffmpeg', '-y', '-i', mp4_path, '-ar', '16000', '-ac', '1', '-vn', wav_path],
            check=True, capture_output=True
        )

        # Whisper 转录
        model = WhisperModel(WHISPER_MODEL, device='cpu', compute_type='int8')
        segments, info = model.transcribe(wav_path, language='zh', beam_size=5)

        lines = []
        for seg in segments:
            start = int(seg.start)
            mm, ss = divmod(start, 60)
            lines.append(f'[{mm:02d}:{ss:02d}] {seg.text.strip()}')

        transcript = '\n'.join(lines)
        return transcript[:15000] if transcript else None

    except Exception as e:
        sys.stderr.write(f'[transcribe] error: {e}\n')
        return None
    finally:
        # 清理临时文件
        for p in [mp4_path, wav_path]:
            try: os.remove(p)
            except: pass
        try: os.rmdir(tmp_dir)
        except: pass


# ─── Main fetch logic ─────────────────────────────────────────────────────────

def run(url):
    ws_url = get_ws_url()
    ws = websocket.WebSocket()
    ws.connect(ws_url, origin='http://localhost:9222')

    _id = [0]
    def send(method, params={}):
        _id[0] += 1
        ws.send(json.dumps({'id': _id[0], 'method': method, 'params': params}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get('id') == _id[0]:
                return msg

    # 创建新标签页
    tid = send('Target.createTarget', {'url': 'about:blank'})['result']['targetId']
    sid = send('Target.attachToTarget', {'targetId': tid, 'flatten': True})['result']['sessionId']

    captured_video_urls = []

    def ss(method, params={}):
        _id[0] += 1
        ws.send(json.dumps({'id': _id[0], 'method': method, 'params': params, 'sessionId': sid}))
        while True:
            msg = json.loads(ws.recv())
            # 顺路收集视频请求事件
            if msg.get('method') == 'Network.requestWillBeSent':
                req_url = msg['params']['request']['url']
                if re.search(r'xhscdn\.com.*\.mp4', req_url):
                    captured_video_urls.append(req_url)
            if msg.get('id') == _id[0] and msg.get('sessionId') == sid:
                return msg

    ss('Page.enable')
    ss('Network.enable')

    note_id = extract_note_id(url)
    navigate_url = url if 'xiaohongshu.com' in url else f'https://www.xiaohongshu.com/explore/{note_id or ""}'
    ss('Page.navigate', {'url': navigate_url})

    CHECK_JS = '''(function(){
        var s = window.__INITIAL_STATE__;
        if(s && s.note && s.note.noteDetailMap){
            var m = s.note.noteDetailMap;
            var k = Object.keys(m);
            for(var i=0;i<k.length;i++){
                var nd = m[k[i]];
                if(nd && nd.note && (nd.note.title || nd.note.desc)){
                    var n = nd.note;
                    var tags = (n.tagList||[]).map(function(t){return t.name||""}).filter(Boolean).join(" ");
                    return JSON.stringify({ok:true,title:n.title||"",desc:n.desc||"",tags:tags});
                }
            }
        }
        var descEl = document.querySelector("#detail-desc,.desc.common-desc,.note-content .desc");
        var titleEl = document.querySelector(".note-content .title,h1");
        if(descEl && descEl.innerText.trim().length > 5){
            return JSON.stringify({ok:true,title:titleEl?titleEl.innerText.trim():"",desc:descEl.innerText.trim(),tags:""});
        }
        var is404 = location.href.includes("/404") || document.title.includes("不见了");
        return JSON.stringify({ok:false,is404:is404,title:document.title});
    })()'''

    note_data = None
    for i in range(CONTENT_TIMEOUT):
        time.sleep(1)
        val = ss('Runtime.evaluate', {'expression': CHECK_JS}).get('result', {}).get('result', {}).get('value', '')
        if not val:
            continue
        data = json.loads(val)
        if data.get('ok'):
            note_data = data
            # 内容已拿到，但视频 URL 可能还没来，再多等几秒
            if not captured_video_urls:
                for _ in range(VIDEO_TIMEOUT):
                    time.sleep(1)
                    ss('Runtime.evaluate', {'expression': 'null'})
                    if captured_video_urls:
                        break
            break
        if data.get('is404') and note_id and i == 3:
            ss('Page.navigate', {'url': f'https://www.xiaohongshu.com/search_result/?keyword={note_id}&source=web_explore_feed'})

    send('Target.closeTarget', {'targetId': tid})
    ws.close()

    if not note_data:
        return None, '内容加载超时或帖子不存在'

    title = note_data.get('title', '')
    desc = note_data.get('desc', '')
    tags = note_data.get('tags', '')

    # 捕获到视频 URL 就转录，无论 note type 是什么
    transcript = None
    if captured_video_urls:
        sys.stderr.write(f'[xhs] 检测到视频，开始转录: {captured_video_urls[0][:80]}\n')
        transcript = transcribe_video_url(captured_video_urls[0], title)

    # 拼装内容
    parts = []
    if title:
        parts.append(f'标题: {title}')
    if transcript:
        parts.append(f'视频转录:\n{transcript}')
    elif desc:
        parts.append(f'正文:\n{desc}')
    if tags:
        parts.append(f'标签: {tags}')

    content = '\n\n'.join(parts)[:15000]
    return content or None, None


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'ok': False, 'error': 'missing url'}))
        sys.exit(1)

    try:
        content, err = run(sys.argv[1])
        if err:
            print(json.dumps({'ok': False, 'error': err}))
        else:
            print(json.dumps({'ok': True, 'content': content}))
    except requests.exceptions.ConnectionError:
        print(json.dumps({'ok': False, 'error': 'debug Chrome 未运行，请先运行 scripts/start-chrome-debug.sh'}))
    except Exception as e:
        print(json.dumps({'ok': False, 'error': str(e)}))
