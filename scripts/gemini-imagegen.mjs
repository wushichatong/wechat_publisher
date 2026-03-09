/**
 * Gemini 图片生成模块
 * 直接调用 Gemini API 生成图片，不依赖外部 skill
 */

import https from 'https';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 生成图片
 * @param {string} prompt - 图片描述
 * @param {string} outputPath - 输出路径
 * @param {string} apiKey - Gemini API Key
 * @param {object} options - 选项
 * @returns {Promise<string>} 输出路径
 */
export async function generateImage(prompt, outputPath, apiKey, options = {}) {
  const model = options.model || 'gemini-3-pro-image-preview';
  const timeout = options.timeout || 600000; // 默认 600 秒
  
  // 使用代理（pro 模型需要）
  const proxy = process.env.GEMINI_PRO_PROXY || 'http://127.0.0.1:7890';
  
  const payload = JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseModalities: ['IMAGE']
    }
  });
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  // 使用 curl 通过代理调用 API（更可靠）
  const tempFile = `/tmp/gemini-response-${Date.now()}.json`;
  const command = `curl -s --max-time ${Math.floor(timeout/1000)} -x "${proxy}" "${apiUrl}" \
    -H "Content-Type: application/json" \
    -d '${payload.replace(/'/g, "'\\''")}' \
    > ${tempFile}`;
  
  try {
    await execAsync(command);
    
    const data = fs.readFileSync(tempFile, 'utf8');
    fs.unlinkSync(tempFile);
    
    const result = JSON.parse(data);
    
    if (result.error) {
      throw new Error(`Gemini API 错误: ${result.error.message}`);
    }
    
    // 提取图片数据
    const candidate = result.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
    
    if (!imagePart || !imagePart.inlineData) {
      throw new Error('响应中没有图片数据');
    }
    
    // 解码 base64 并保存
    const imageData = Buffer.from(imagePart.inlineData.data, 'base64');
    fs.writeFileSync(outputPath, imageData);
    
    return outputPath;
  } catch (error) {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    throw error;
  }
}
