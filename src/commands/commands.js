export async function tagAllMembers(bot, chatId) {
    try {
        const chatInfo = await bot.getChats(chatId);
        if (!chatInfo?.chats?.[0]) return;
        const chat = chatInfo.chats[0];
        const botProfile = await bot.getProfile();
        const botMID = botProfile.mid;
        let memberMids = [];
        if (chat.extra?.groupExtra?.memberMids) {
            memberMids = Object.keys(chat.extra.groupExtra.memberMids).filter(mid => mid !== botMID);
        }
        if (memberMids.length === 0) {
            await bot.send(chatId, '❌ No members to tag');
            return;
        }
        const chunkSize = 20;
        const totalChunks = Math.ceil(memberMids.length / chunkSize);
        for (let i = 0; i < totalChunks; i++) {
            const chunk = memberMids.slice(i * chunkSize, (i + 1) * chunkSize);
            let result = '「 Group Members 」\nStatus: Tagged\n';
            const mentionees = [];
            chunk.forEach((mid, index) => {
                const no = (i * chunkSize) + index + 1;
                const mention = '@xxxxxxxxxx\n';
                result += `    ${no}. ${mention}`;
                const slen = result.length - 12;
                const elen = result.length + 3;
                mentionees.push({
                    S: slen.toString(),
                    E: (elen - 4).toString(),
                    M: mid
                });
            });
            if (result.endsWith('\n')) result = result.slice(0, -1);
            const options = {
                contentMetadata: {
                    MENTION: JSON.stringify({ MENTIONEES: mentionees })
                }
            };
            await bot.send(chatId, result, options);
            if (i < totalChunks - 1) await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        await bot.send(chatId, '❌ An error occurred while tagging');
    }
}

export async function showChatInfo(bot, chatId) {
    try {
        const chatInfo = await bot.getChats(chatId);
        if (chatInfo?.chats?.[0]) {
            const chat = chatInfo.chats[0];
            const memberCount = chat.extra?.groupExtra?.memberMids ? 
                Object.keys(chat.extra.groupExtra.memberMids).length : 0;
            
            const info = `🔍 Chat Info:
📝 Name: ${chat.chatName}
🆔 MID: ${chat.chatMid}
👥 Member Count: ${memberCount}`;
            
            await bot.send(chatId, info);
        }
    } catch (error) {
        await bot.send(chatId, '❌ Chat info fetching failed');
    }
}

export async function kickMember(bot, chatId, usersToKick) {
    try {
        const kickPromises = usersToKick.map(async (userId) => {
            try {
                await bot.deleteOtherFromChat(chatId, userId);
                return { userId, success: true };
            } catch (kickError) {
                return { userId, success: false, error: kickError.message };
            }
        });

    } catch (error) {
        try {
            await bot.send(chatId, '❌ An error occurred while kicking the members');
        } catch (sendError) {
        }
    }
}

export async function cancelAll(bot, chatId, usersToCancel = null) {
    try {
        let inviteeMids = usersToCancel;
        
        if (!usersToCancel) {
            const chatInfo = await bot.getChats(chatId);
            if (!chatInfo?.chats?.[0]) return;
            const chat = chatInfo.chats[0];
            
            inviteeMids = [];
            if (chat.extra?.groupExtra?.inviteeMids) {
                inviteeMids = Object.keys(chat.extra.groupExtra.inviteeMids);
            }
            
            if (inviteeMids.length === 0) {
                await bot.send(chatId, '❌ No pending invitations to cancel');
                return;
            }
        }
        
        const cancelPromises = inviteeMids.map(async (userId) => {
            try {
                await bot.cancelChatInvitation(chatId, userId);
                return { userId, success: true };
            } catch (cancelError) {
                return { userId, success: false, error: cancelError.message };
            }
        });
        
        const results = await Promise.allSettled(cancelPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;
        
        const message = successful === inviteeMids.length 
            ? `✅ All ${successful} invitations cancelled successfully!`
            : `⚡ Cancel completed: ${successful} success, ${failed} failed (${inviteeMids.length} total)`;
            
        await bot.send(chatId, message);
    } catch (error) {
        try {
            await bot.send(chatId, '❌ An error occurred while cancelling invitations');
        } catch (sendError) {
        }
    }
}

export async function showStats(bot, chatId) {
    try {
        const stats = bot.stats || { messages: 0 };
        const uptime = bot.startTime ? Math.floor((Date.now() - bot.startTime) / 1000) : 0;
        const uptimeStr = `${Math.floor(uptime / 60)}m ${uptime % 60}s`;
        
        const statsMsg = `📊 Bot Stats:
📬 Messages: ${stats.messages}
⏱️ Uptime: ${uptimeStr}
✅ Status: Active`;
        
        await bot.send(chatId, statsMsg);
    } catch (error) {
        await bot.send(chatId, '❌ Stats fetching failed');
    }
}

export async function showHelp(bot, chatId) {
    const helpMsg = `🤖 ModularLineBot Commands:

🔸 hi - Hello message
🔸 time - Şu anki saat
🔸 stats - Bot stats
🔸 tagall/tag - Tag all group members
🔸 gr - Group info
🔸 chats - All chats
🔸 help - Help menu
🔸 bye - Leave group

📝 Sent message commands:
🔹 ping - Pong response
🔹 version - Bot version
🔹 joke - Random joke`;
    
    await bot.send(chatId, helpMsg);
}

export async function leaveGroup(bot, chatId) {
    try {
        await bot.send(chatId, 'Goodbye! 👋 Leaving the group...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await bot.deleteSelfFromChat(chatId);
    } catch (error) {
        await bot.send(chatId, '❌ An error occurred while leaving the group');
    }
}

export async function sayHi(bot, chatId) {
    await bot.send(chatId, 'Hello! 👋');
}

export async function showTime(bot, chatId) {
    const now = new Date().toLocaleString('tr-TR');
    await bot.send(chatId, `🕐 Time: ${now}`);
}

export async function sendPong(bot, chatId) {
    await bot.send(chatId, 'Pong! 🏓');
}

export async function showVersion(bot, chatId) {
    await bot.send(chatId, '📦 ModularLineBot v1.0');
}

export async function tellJoke(bot, chatId) {
    await bot.send(chatId, '😂 Why is the PC cold? Windows is open!');
}

export async function getAllChatMids(bot, chatId) {
    try {
        const result = await bot.getAllChatMids(true, true);
        const allChatMids = [...(result.memberChatMids || []), ...(result.invitedChatMids || [])];
        
        if (allChatMids.length === 0) {
            await bot.send(chatId, '❌ Chat bulunamadı');
            return [];
        }
        
        const chatDetails = await bot.getChats(allChatMids);
        const chatMap = {};
        
        if (chatDetails?.chats) {
            chatDetails.chats.forEach(chat => {
                chatMap[chat.chatMid] = chat.chatName || 'Unknown Chat';
            });
        }
        let message = `📋 All Chats (${allChatMids.length} adet):\n\n`;
        
        if (result.memberChatMids?.length > 0) {
            message += `👥 Member Chats (${result.memberChatMids.length}):\n`;
            result.memberChatMids.forEach((mid, index) => {
                const chatName = chatMap[mid] || 'Unknown Chat';
                message += `  ${index + 1}. ${chatName}\n     ${mid}\n`;
            });
        }
        
        if (result.invitedChatMids?.length > 0) {
            message += `📨 Invited Chats (${result.invitedChatMids.length}):\n`;
            result.invitedChatMids.forEach((mid, index) => {
                const chatName = chatMap[mid] || 'Unknown Chat';
                message += `  ${index + 1}. ${chatName}\n     ${mid}\n`;
            });
        }
        
        if (message.length > 1000) {
            const chunks = [];
            for (let i = 0; i < message.length; i += 1000) {
                chunks.push(message.slice(i, i + 1000));
            }
            
            for (let chunk of chunks) {
                await bot.send(chatId, chunk);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } else {
            await bot.send(chatId, message);
        }
        
        return allChatMids;
        
    } catch (error) {
        await bot.send(chatId, '❌ An error occurred while getting the chat list');
        return [];
    }
}