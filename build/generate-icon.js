const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

// 创建 SVG 图标内容
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- 背景 -->
  <rect width="512" height="512" rx="100" fill="url(#grad1)"/>
  
  <!-- 屏幕图标 -->
  <rect x="100" y="120" width="312" height="200" rx="16" fill="white" opacity="0.95" filter="url(#shadow)"/>
  <rect x="120" y="140" width="272" height="160" rx="8" fill="#667eea"/>
  
  <!-- 屏幕内容 - 模拟窗口 -->
  <rect x="140" y="160" width="80" height="60" rx="4" fill="rgba(255,255,255,0.3)"/>
  <rect x="240" y="160" width="80" height="60" rx="4" fill="rgba(255,255,255,0.3)"/>
  <rect x="340" y="160" width="40" height="60" rx="4" fill="rgba(255,255,255,0.3)"/>
  
  <!-- 录制按钮 -->
  <circle cx="256" cy="360" r="40" fill="#f5576c" filter="url(#shadow)"/>
  <circle cx="256" cy="360" r="24" fill="white"/>
  
  <!-- 装饰元素 - 信号波 -->
  <circle cx="256" cy="100" r="8" fill="white" opacity="0.8"/>
  <circle cx="256" cy="100" r="20" fill="none" stroke="white" stroke-width="2" opacity="0.6"/>
  <circle cx="256" cy="100" r="32" fill="none" stroke="white" stroke-width="2" opacity="0.4"/>
  
  <!-- 装饰线条 -->
  <line x1="160" y1="100" x2="160" y2="80" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  <line x1="256" y1="100" x2="256" y2="80" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  <line x1="352" y1="100" x2="352" y2="80" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  
  <!-- 文字 "OBS" -->
  <text x="256" y="450" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle" opacity="0.9">OBS</text>
</svg>
`;

async function generateIcons() {
  try {
    // 确保 build 目录存在
    if (!fs.existsSync('build')) {
      fs.mkdirSync('build', { recursive: true });
    }

    // 生成不同尺寸的 PNG 图标
    const sizes = [16, 32, 48, 64, 128, 256, 512];
    const pngBuffers = [];

    for (const size of sizes) {
      const pngBuffer = await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toBuffer();
      
      pngBuffers.push({ size, buffer: pngBuffer });
      await sharp(pngBuffer).toFile(`build/icon-${size}.png`);
    }

    // 生成主要的 icon.png (256x256)
    await sharp(Buffer.from(svgIcon))
      .resize(256, 256)
      .png()
      .toFile('build/icon.png');

    // 生成真正的 ICO 文件（包含多个尺寸，最大256）
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const icoBuffers = [];
    
    for (const size of icoSizes) {
      const buffer = await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toBuffer();
      icoBuffers.push(buffer);
    }
    
    // 生成 ICO 文件
    const icoBuffer = await toIco(icoBuffers);
    const icoPath = path.join(__dirname, 'icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`ICO文件已保存: ${icoPath}`);

    console.log('✅ 图标生成成功！');
    console.log('📁 文件位置: build/icon.png, build/icon.ico');
    console.log('📐 尺寸: 256x256 (PNG), 多尺寸 (ICO: 16-256px)');
  } catch (error) {
    console.error('❌ 生成图标失败:', error);
    process.exit(1);
  }
}

generateIcons();
