import { createRequire } from 'module';
import Logger from './Logger.js';

const require = createRequire(import.meta.url);
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');

export class QrCodeGenerator {
    constructor(options = {}) {
        this.boxSize = options.boxSize ?? 1;
        this.border = options.border ?? 1;
        this.small = options.small ?? true;
    }

    async generateConsoleQR(url) {
        try {
            qrcode.generate(url, { 
                small: this.small 
            });
            
            Logger.info('QR_GEN', '');
            Logger.info('QR_GEN', `🔗 QR URL: ${url.substring(0, 50)}...`);
            
            return true;
            
        } catch (error) {
            Logger.error('QR_GEN', 'Failed to generate console QR:', error.message);
            
            Logger.warn('QR_GEN', '⚠️  QR code display failed, use this URL:');
            Logger.info('QR_GEN', url);
            return false;
        }
    }

    async generateImageQR(url, filepath = './qrcode.png') {
        try {
            
            await QRCode.toFile(filepath, url, {
                type: 'png',
                quality: 0.92,
                margin: this.border,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            Logger.success('QR_GEN', `✅ QR code image saved to: ${filepath}`);
            return filepath;
            
        } catch (error) {
            Logger.error('QR_GEN', 'Failed to generate image QR:', error.message);
            return null;
        }
    }

    async generateBase64QR(url) {
        try {
            
            const base64 = await QRCode.toDataURL(url, {
                type: 'image/png',
                quality: 0.92,
                margin: this.border,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            Logger.success('QR_GEN', '✅ QR code generated as base64');
            return base64;
            
        } catch (error) {
            Logger.error('QR_GEN', 'Failed to generate base64 QR:', error.message);
            return null;
        }
    }

    static formatProgress(step, message, data = null) {
        const stepEmojis = {
            session: '🔧',
            qr_code: '📱',
            waiting: '⏳',
            qr_verified: '✅',
            cert_verified: '🔒',
            cert_failed: '⚠️',
            pin_created: '🔢',
            pin_verified: '✅',
            login_complete: '🎉',
            cert_saved: '💾',
            error: '❌'
        };

        const emoji = stepEmojis[step] || '📍';
        const timestamp = new Date().toLocaleTimeString();
        
        Logger.info('QR_PROGRESS', `[${timestamp}] ${emoji} ${message}`);
        
        if (data && step === 'qr_code') {
            Logger.info('QR_PROGRESS', `📋 Callback URL: ${data.callbackUrl}`);
        }
        
        if (data && step === 'pin_created') {
            Logger.info('QR_PROGRESS', `🔢 PIN CODE: ${data.pinCode}`);
            Logger.info('QR_PROGRESS', '💡 Enter this PIN code in your LINE app now...');
        }
    }

    static showLoginResult(loginResult) {
        Logger.success('QR_LOGIN', '\n🎉 LOGIN SUCCESSFUL!');
        Logger.info('QR_LOGIN', '━'.repeat(50));
        
        if (loginResult.certificate) {
            Logger.info('QR_LOGIN', `🔒 Certificate: ${loginResult.certificate.substring(0, 30)}...`);
        }
        
        if (loginResult.tokenV3IssueResult) {
            Logger.info('QR_LOGIN', `🎫 Token V3 Result: Available`);
        }
        
        if (loginResult.mid) {
            Logger.info('QR_LOGIN', `👤 User MID: ${loginResult.mid}`);
        }
        
        if (loginResult.lastBindTimestamp) {
            const date = new Date(loginResult.lastBindTimestamp);
            Logger.info('QR_LOGIN', `⏰ Last Bind: ${date.toLocaleString()}`);
        }
        
        Logger.info('QR_LOGIN', '━'.repeat(50));
        Logger.success('QR_LOGIN', '✅ QR login completed successfully! 🚀');
    }
}

export default QrCodeGenerator;
