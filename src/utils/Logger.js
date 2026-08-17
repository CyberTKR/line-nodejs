const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

class Logger {
    static logLevel = process.env.LOG_LEVEL || 'DEBUG';
    
    static formatTimestamp() {
        return new Date().toISOString().substring(11, 23);
    }
    
    static formatMessage(level, category, message, ...args) {
        const timestamp = this.formatTimestamp();
        const categoryStr = category ? `[${category}]` : '';
        
        let colorCode = colors.white;
        let emoji = '📝';
        
        switch (level) {
            case 'DEBUG':
                colorCode = colors.cyan;
                emoji = '🔍';
                break;
            case 'INFO':
                colorCode = colors.blue;
                emoji = '📋';
                break;
            case 'SUCCESS':
                colorCode = colors.green;
                emoji = '✅';
                break;
            case 'WARN':
                colorCode = colors.yellow;
                emoji = '⚠️';
                break;
            case 'ERROR':
                colorCode = colors.red;
                emoji = '❌';
                break;
            case 'STARTUP':
                colorCode = colors.magenta;
                emoji = '🚀';
                break;
            case 'STORAGE':
                colorCode = colors.cyan;
                emoji = '💾';
                break;
            case 'POLLING':
                colorCode = colors.blue;
                emoji = '🔄';
                break;
            case 'MESSAGE':
                colorCode = colors.green;
                emoji = '📨';
                break;
            case 'E2EE':
                colorCode = colors.magenta;
                emoji = '🔐';
                break;
        }
        
        const prefix = `[${timestamp}] ${emoji} ${categoryStr} ${level}:`;
        const formattedMessage = `${colorCode}${prefix}${colors.reset}`;
        
        return { formattedMessage, args: [message, ...args] };
    }
    
    static shouldLog(level) {
        const levels = { DEBUG: 0, INFO: 1, SUCCESS: 1, WARN: 2, ERROR: 3, STARTUP: 1, STORAGE: 1, POLLING: 1, MESSAGE: 1, E2EE: 1 };
        const currentLevel = levels[this.logLevel] ?? 1;
        const messageLevel = levels[level] ?? 1;
        return messageLevel >= currentLevel;
    }
    
    static log(level, category, message, ...args) {
        if (!this.shouldLog(level)) return;
        
        const { formattedMessage, args: messageArgs } = this.formatMessage(level, category, message, ...args);
        console.log(formattedMessage, ...messageArgs);
    }
    
    static debug(category, message, ...args) {
        this.log('DEBUG', category, message, ...args);
    }
    
    static info(category, message, ...args) {
        this.log('INFO', category, message, ...args);
    }
    
    static success(category, message, ...args) {
        this.log('SUCCESS', category, message, ...args);
    }
    
    static warn(category, message, ...args) {
        this.log('WARN', category, message, ...args);
    }
    
    static error(category, message, ...args) {
        this.log('ERROR', category, message, ...args);
    }
    
    static startup(message, ...args) {
        this.log('STARTUP', 'STARTUP', message, ...args);
    }
    
    static storage(message, ...args) {
        this.log('STORAGE', 'STORAGE', message, ...args);
    }
    
    static polling(message, ...args) {
        this.log('POLLING', 'POLLING', message, ...args);
    }
    
    static message(message, ...args) {
        this.log('MESSAGE', 'MESSAGE', message, ...args);
    }
    
    static e2ee(message, ...args) {
        this.log('E2EE', 'E2EE', message, ...args);
    }
    
    static setLevel(level) {
        this.logLevel = level;
    }
}

export default Logger;
