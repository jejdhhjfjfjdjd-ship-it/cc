// Chạy lúc deploy: quét public/music và ghi danh sách bài vào public/tracks.json
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'public', 'music');
fs.mkdirSync(dir, { recursive: true });
const list = fs.readdirSync(dir).filter(f => /\.(mp3|ogg|wav|m4a|aac)$/i.test(f)).sort()
  .map(f => ({ name: f.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), src: 'music/' + encodeURIComponent(f) }));
fs.writeFileSync(path.join(__dirname, 'public', 'tracks.json'), JSON.stringify(list, null, 1));
console.log('Đã tìm thấy ' + list.length + ' bài nhạc');
