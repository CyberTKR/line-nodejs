import fs from 'fs';
import path from 'path';
import Logger from '../utils/Logger.js';
import { safeJSONParse } from '../utils/Helpers.js';

export class StorageManager {
    constructor(customPath = null) {
        this.customPath = customPath;
        this.storagePath = null;
        this.botMid = null;
        this.initialized = false;
    }

    initialize(botMid, profile = null) {
        this.botMid = botMid;
        
        if (this.customPath) {
            if (this.customPath.endsWith('/')) {
                this.storagePath = path.join(this.customPath, `${botMid}.json`);
            } else {
                this.storagePath = this.customPath;
            }
        } else {
            const storageDir = './data';
            this._ensureDirectory(storageDir);
            this.storagePath = path.join(storageDir, `${botMid}.json`);
        }

        const storageDir = path.dirname(this.storagePath);
        this._ensureDirectory(storageDir);

        global.LineNodeStoragePath = this.storagePath;

        if (!fs.existsSync(this.storagePath)) {
            const initialData = {
                created: new Date().toISOString(),
                botMid: this.botMid,
                botName: profile?.displayName || 'Unknown Bot',
                version: '1.0.0'
            };
            
            fs.writeFileSync(this.storagePath, JSON.stringify(initialData, null, 2));
            Logger.storage('Created initial storage:', this.storagePath);
        } else {
            Logger.storage('Using existing storage:', this.storagePath);
        }
        this.initialized = true;
        if (profile && fs.existsSync(this.storagePath)) {
            this.saveData('botMid', this.botMid);
            this.saveData('botName', profile.displayName || 'Unknown Bot');
            this.saveData('statusMessage', profile.statusMessage || '');
        }
        return this.storagePath;
    }

    saveData(key, data) {
        if (!this.initialized) {
            throw new Error('Storage not initialized. Call initialize() first.');
        }
        try {
            const existingData = this._loadStorageFile();
            
            if (typeof key === 'string') {
                existingData[key] = data;
            } else {
                Object.assign(existingData, key);
            }
            existingData._lastModified = new Date().toISOString();
            this._saveStorageFile(existingData);
            return true;

        } catch (error) {
            Logger.error('STORAGE', 'Save failed:', error.message);
            return false;
        }
    }

    loadData(key = null, defaultValue = null) {
        if (!this.initialized) {
            throw new Error('Storage not initialized. Call initialize() first.');
        }

        try {
            const data = this._loadStorageFile();
            
            if (key === null) {
                return data;
            }
            
            return data[key] !== undefined ? data[key] : defaultValue;

        } catch (error) {
            Logger.error('STORAGE', 'Load failed:', error.message);
            return key === null ? {} : defaultValue;
        }
    }

    deleteData(key) {
        if (!this.initialized) {
            throw new Error('Storage not initialized. Call initialize() first.');
        }

        try {
            const data = this._loadStorageFile();
            
            if (data[key] !== undefined) {
                delete data[key];
                data._lastModified = new Date().toISOString();
                
                this._saveStorageFile(data);
                Logger.debug('STORAGE', 'Deleted data:', key);
                return true;
            }

            return false;

        } catch (error) {
            Logger.error('STORAGE', 'Delete failed:', error.message);
            return false;
        }
    }

    hasData(key) {
        if (!this.initialized) {
            return false;
        }

        try {
            const data = this._loadStorageFile();
            return data[key] !== undefined;

        } catch (error) {
            return false;
        }
    }

    getKeys() {
        if (!this.initialized) {
            return [];
        }

        try {
            const data = this._loadStorageFile();
            return Object.keys(data).filter(key => !key.startsWith('_'));

        } catch (error) {
            Logger.error('STORAGE', 'Keys enumeration failed:', error.message);
            return [];
        }
    }

    clearData() {
        if (!this.initialized) {
            throw new Error('Storage not initialized. Call initialize() first.');
        }

        try {
            const clearedData = {
                created: new Date().toISOString(),
                botMid: this.botMid,
                version: '1.0.0',
                _lastModified: new Date().toISOString(),
                _cleared: new Date().toISOString()
            };

            this._saveStorageFile(clearedData);
            Logger.storage('Storage cleared');
            return true;

        } catch (error) {
            Logger.error('STORAGE', 'Clear failed:', error.message);
            return false;
        }
    }

    clearE2EEData() {
        if (!this.initialized) {
            throw new Error('Storage not initialized. Call initialize() first.');
        }

        try {
            const data = this._loadStorageFile();
            let clearedCount = 0;

            const e2eePatterns = [
                /^e2eeKeys:/,    
                /^key_/,     
                /^publicKey_/,
                /^groupKey_/,
                /^[a-f0-9]{32,33}$/,
                /^u[a-f0-9]{32}$/,
                /^\d{7,}$/
            ];

            Object.keys(data).forEach(key => {
                if (e2eePatterns.some(pattern => pattern.test(key))) {
                    delete data[key];
                    clearedCount++;
                    Logger.debug('STORAGE', 'Cleared E2EE key:', key);
                }
            });

            data._lastModified = new Date().toISOString();
            data._e2eeCleared = new Date().toISOString();

            this._saveStorageFile(data);
            Logger.storage(`E2EE data cleared: ${clearedCount} keys removed`);
            return clearedCount;

        } catch (error) {
            Logger.error('STORAGE', 'E2EE clear failed:', error.message);
            return 0;
        }
    }

    getStats() {
        if (!this.initialized) {
            return null;
        }

        try {
            const stats = fs.statSync(this.storagePath);
            const data = this._loadStorageFile();
            const keys = Object.keys(data).filter(key => !key.startsWith('_'));

            return {
                filePath: this.storagePath,
                fileSize: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                keyCount: keys.length,
                keys: keys,
                botMid: this.botMid
            };

        } catch (error) {
            Logger.error('STORAGE', 'Stats failed:', error.message);
            return null;
        }
    }

    _loadStorageFile() {
        try {
            const content = fs.readFileSync(this.storagePath, 'utf8');
            return safeJSONParse(content, {});
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {};
            }
            throw error;
        }
    }

    _saveStorageFile(data) {
        const content = JSON.stringify(data, null, 2);
        fs.writeFileSync(this.storagePath, content, 'utf8');
    }

    _ensureDirectory(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                Logger.debug('STORAGE', 'Created storage directory:', dirPath);
            }
        } catch (error) {
            Logger.error('STORAGE', 'Failed to create directory:', error.message);
        }
    }
}

export default StorageManager;
