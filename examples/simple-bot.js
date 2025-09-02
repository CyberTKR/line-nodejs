import { Bot } from '../src/core/Bot.js';
import { 
    tagAllMembers, 
    showChatInfo, 
    showStats, 
    showHelp, 
    leaveGroup,
    sayHi,
    showTime,
    sendPong,
    showVersion,
    tellJoke,
    getAllChatMids
} from '../src/commands/commands.js';

const bot = new Bot({
    device: "DESKTOPWIN",  
    enableE2EE: true, // true: decrypt encrypted messages, false: leave encrypted messages as-is
    logLevel: 'DEBUG'
});

bot.onReady((profile) => {
    console.log('Auth Token:', bot.client.authToken);
    console.log(`Bot started: ${profile.displayName}`);
});


bot.onText(async (message) => {
    const { text, from, to, encrypted, type } = message;
    if (!text || typeof text !== 'string') {
        return;
    }
    
    const command = text.toLowerCase().trim();

    if (type === 'receive') {
        
        if (command === 'hi') {
            await sayHi(bot, to);
        }
        else if (command === 'time') {
            await showTime(bot, to);
        }
        else if (command === 'gr') {
            await showChatInfo(bot, to);
        }
        else if (command === 'tagall' || command === 'tag') {
            await tagAllMembers(bot, to);
        }
        else if (command === 'stats') {
            await showStats(bot, to);
        }
        else if (command === 'help') {
            await showHelp(bot, to);
        }
        else if (command === 'chats') {
            await getAllChatMids(bot, to);
        }
        else if (command === 'bye') {
            await leaveGroup(bot, to);
        }
    }
    
    else {
        
        if (command === 'ping') {
            await sendPong(bot, to);
        }
        else if (command === 'version') {
            await showVersion(bot, to);
        }
        else if (command === 'joke') {
            await tellJoke(bot, to);
        }
    }
});

bot.onInvite(async (invite) => {
    const { groupId, inviter, invited } = invite;
    
    const botProfile = await bot.getProfile();
    const botMid = botProfile.mid;
    
    let invitedUsers = [];
    if (invited) {
        if (invited instanceof Uint8Array) {
            const invitedString = new TextDecoder().decode(invited);
            invitedUsers = invitedString.split('\x1e').filter(id => id.length > 0);
        } else if (Array.isArray(invited)) {
            invitedUsers = invited;
        } else if (typeof invited === 'string') {
            invitedUsers = [invited];
        }
    }
    
    
    if (invitedUsers.includes(botMid)) {
        try {
            await bot.acceptInvitation(groupId);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await bot.send(groupId, '👋 Hello! Im ModularLineBot. You can learn the commands by typing "help"!');
        } catch (error) {
            console.error(`❌ Failed to join group ${groupId}:`, error.message);
            
            if (error.stack) {
                console.error('Error stack:', error.stack);
            }
        }
    }
});

bot.onMessage(async () => {
    if (!bot.stats) bot.stats = { messages: 0 };
    bot.stats.messages++;
});

bot.onError((error) => {
    console.error('❌ Bot Error:', error.message);
    
    if (error.message.includes('clientCallback is not a function')) {
        console.error('🔧 Thrift callback error detected - this is usually a temporary issue');
        console.log('💡 Bot will continue running and retry on next operation');
    }
    
    if (error.stack && process.env.DEBUG) {
        console.error('Error stack:', error.stack);
    }
});


process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    if (reason?.message?.includes('clientCallback is not a function')) {
        console.log('🔧 Ignoring thrift callback error - continuing...');
        return;
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    if (error.message.includes('clientCallback is not a function')) {
        console.log('🔧 Ignoring thrift callback error - continuing...');
        return;
    }
    console.error('💥 Critical error - shutting down');
    process.exit(1);
});

async function startBot() {
    try {
        await bot.start();
    } catch (error) {
        console.error('❌ Failed to start:', error.message);
    }
}

process.on('SIGINT', async () => {
    await bot.stop();
    process.exit(0);
});

startBot();