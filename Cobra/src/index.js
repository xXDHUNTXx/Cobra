require('dotenv').config(); 
const { Client, IntentsBitField, ActivityType, ChannelType, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const token = process.env.steamtoken;
const fs = require('fs');


const client = new Client({ intents: [ 
    IntentsBitField.Flags.Guilds, 
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.MessageContent]});
    
const flags = [
	PermissionsBitField.Flags.ViewChannel,
	PermissionsBitField.Flags.EmbedLinks,
	PermissionsBitField.Flags.AttachFiles,
	PermissionsBitField.Flags.ReadMessageHistory,
	PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.SendMessages,
];

const permissions = new PermissionsBitField(flags);

const sentMessagesFile = 'sent_messages.json';

let startTime = null;


let sentMessages = {};
try {
    const data = fs.readFileSync(sentMessagesFile, 'utf8');
    sentMessages = JSON.parse(data);
} catch (err) {

    console.error('Error reading sent messages file:', err);
}

client.on('guildCreate', (guild) => {
    console.log(`Bot joined the guild: ${guild.name} (ID: ${guild.id})`);
 
});

client.on('guildDelete', (guild) => {
    console.log(`Bot left the guild: ${guild.name} (ID: ${guild.id})`);

});

let guildId;

client.on('ready', async () => {
    try {
        console.log(`${client.user.tag} is online.`);
        client.user.setActivity({
            name: 'Steam',
            type: ActivityType.Watching,
        });

        startTime = new Date();

        client.guilds.cache.forEach(async (guild) => {
            
            if (!guildId) {
                guildId = guild.id;
            }
            
            let category = guild.channels.cache.find(channel => channel.type === ChannelType.GuildCategory && channel.name === 'Cobra');

            if (!category) {
                category = await guild.channels.create({
                    type: ChannelType.GuildCategory,
                    name: 'Cobra',
                });

                console.log(`Created category: ${category.name}`);
            } else {
                console.log('Category already exists');
            }

            const channelsToCreate = [
                { name: 'steam-urls', type: ChannelType.GuildText },
                { name: 'friends', type: ChannelType.GuildText },
                { name: 'eac-ban-search', type: ChannelType.GuildText },
                { name: 'config-settings', type: ChannelType.GuildText },
                // Add more channels as needed
            ];

            const existingChannels = guild.channels.cache.filter(
                ch => ch.type === ChannelType.GuildText && ch.parentId === category.id
            );

            for (const channelData of channelsToCreate) {
                const existingChannel = existingChannels.find(ch => ch.name === channelData.name);

                if (!existingChannel) {
                    const newChannel = await guild.channels.create({
                        type: channelData.type,
                        name: channelData.name,
                        parent: category.id 
                        // Additional properties for the text channel can be added here
                    });

                    const messagesToSend = [
                        { channelName: 'steam-urls', message: '**Info**\nThis channel will take a Steam profile link and return the SteamID64.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**How to use**\n1. Get a Steam profile link.\n2. Send the Steam profile link in this channel, and the bot will return the Steam64ID associated with that account.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**Not working?**\nContact Morty\n--------------------------------------------------------------------------------------------------------------------------------------------------' },
                        { channelName: 'friends', message: '**Info**\nThis channel takes multiple steam64IDs and returns the common friends associated with the accounts.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**How to use**\n1. Get the player\'s steam64ID from steamid.io or use #steam-urls\n2. Send the steam64IDs in this channel.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**Not working?**\nContact Morty\n--------------------------------------------------------------------------------------------------------------------------------------------------' },
                        { channelName: 'eac-ban-search', message: '**Info**\nThis channel takes a Steam64ID and searches a database of **000000** Rust bans to see if the player has been banned in Rust.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**How to use**\n1. Get the player\'s Steam64ID from a website like steamid.io or use #steam-urls.\n2. Put the steam64ID in here, and the bot will return with the results.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**Not working?**\nContact Morty | Note: this isn\'t working as of now. This is a placeholder.\n--------------------------------------------------------------------------------------------------------------------------------------------------' },
                        { channelName: 'config-settings', message: '**Info**\nThis is for testing. Do __!list__ to see the available commands\n--------------------------------------------------------------------------------------------------------------------------------------------------' },
                        // Add more channels and messages as needed
                    ];

                    for (const { channelName, message } of messagesToSend) {
                        const channel = guild.channels.cache.find(
                            (ch) => ch.type === ChannelType.GuildText && ch.name === channelName
                        );

                        if (channel) {
                            if (!sentMessages[channel.id]) {
                                try {
                                    await channel.send(message);
                                    console.log(`Sent message to ${channelName} channel.`);
                                    sentMessages[channel.id] = true;
                                } catch (error) {
                                    console.error(`Error sending message to ${channelName} channel:`, error);
                                }
                            } else {
                                console.log(`Message already sent to ${channelName} channel.`);
                            }
                        } else {
                            console.error(`Channel '${channelName}' not found.`);
                        }
                    }

                    
                    fs.writeFileSync(sentMessagesFile, JSON.stringify(sentMessages, null, 2), 'utf8');
                } else {
                    console.log(`Channel '${existingChannel.name}' already exists in category '${category.name}'`);
                }
            }
        });

    } catch (error) {
        console.error('Error:', error);
    }
});


function calculateUptime() {
    if (!startTime) return 'Bot is not online yet'; 

    const currentTime = new Date();
    const uptime = currentTime - startTime;

    // Calculate hours, minutes, seconds, and says
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
}

// Command handler for !uptime
client.on('messageCreate', async (message) => {
    try {
        if (message.content === '!uptime' && message.channel.name === 'config-settings') {
            const uptime = calculateUptime();
            const botResponse = await message.channel.send(`Bot uptime: ${uptime}`);

            // Delete the user's command message and the bot's response after 1 minute
        //    setTimeout(() => {
        //        message.delete().catch(console.error);
        //        botResponse.delete().catch(console.error);
        //    }, 1 * 60 * 1000); // 1 minute in milliseconds
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

// Command handler for !list for config-settings
client.on('messageCreate', async (message) => {
    try {
        if (message.content === '!list' && message.channel.name === 'config-settings') {
            message.channel.send('**list of commands**\n!uptime - Tells you how long the bot has been online.\n!resetchannels - creates new channels if none are found.')
        }
    } catch (error) {
        console.error('Error:', error);
    }
});


// SteamID fetcher via profile url

client.on('messageCreate', async (message) => {
    try {
        const steamIDRegex = /^(https?:\/\/)?steamcommunity\.com\/(?:id|profiles)\/[\w\d]+\/?$/;
        const steamurlchannelname = 'steam-urls';

        if (message.channel.name === steamurlchannelname) {
            let steamID = '';

            if (steamIDRegex.test(message.content)) {
                if (message.deletable) {
                    await message.delete(); 
                }

                const match = message.content.match(/(?:id|profiles)\/([\w\d]+)/);
                const vanityID = match[1];

                if (vanityID.length !== 17 || isNaN(vanityID)) {
                    const profileData = await axios.get(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${token}&vanityurl=${vanityID}`);
                    steamID = profileData.data.response.steamid;
                } else {
                    steamID = vanityID;
                }
            } else if (/^\d{17}$/.test(message.content)) {
                steamID = message.content.trim(); 
            } else {
                
                return;
            }

            if (steamID) {
                
                const banData = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${token}&steamids=${steamID}`);
                const playerBans = banData.data.players[0];

                if (playerBans) {
                    const banStatus = playerBans.NumberOfVACBans > 0 ? ':x: VAC Banned' : ':white_check_mark: Not VAC Banned';
                    const gameBan = playerBans.NumberOfGameBans > 0 ? ':x: Game Banned' : ':white_check_mark: Not Game Banned';
                    const communityBan = playerBans.CommunityBanned ? ':x: Community Banned' : ':white_check_mark: Not Community Banned';
                    const banInfo = `**Ban Information**\nVAC Status: ${banStatus}\nGame Ban Status: ${gameBan}\nCommunity Ban: ${communityBan}`;
                    const messageToSend = `Profiles: [[STEAM]](<https://steamcommunity.com/profiles/${steamID}>) - [BM]\nSteam64ID: ${steamID}\n${banInfo}`;

                    
                    const sentMessage = await message.channel.send(messageToSend);

                    // Delete the message after 1 minute
                //    setTimeout(() => {
                //        if (sentMessage.deletable) {
                //            sentMessage.delete().catch(console.error);
                //       }
                //    }, 1 * 60 * 1000); // 1 minute in milliseconds
                } else {
                    message.channel.send('No ban information available for this Steam ID.');
                }
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
        message.channel.send('There was an error processing the request.');
    }
});

  // Friend checker via 2 steamid's

  client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot || message.author.id === client.user.id) return;
        if (message.channel.name === 'friends') {
            const steamIDRegex = /\b\d{17}\b/g; 

            const steamIDs = message.content.match(steamIDRegex);

            if (steamIDs && steamIDs.length >= 2) {
                const results = await Promise.all(steamIDs.map(async (steamID) => {
                    try {
                        const friendsData = await axios.get(`https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${token}&steamid=${steamID}`);
                        const friendIDs = friendsData.data.friendslist.friends.map((friend) => friend.steamid);
                        const commonFriends = friendIDs.filter((friendID) => steamIDs.includes(friendID));

                        
                        let error = '';
                        if (friendIDs.length === 0) {
                            error = 'No friends found.';
                        } else if (commonFriends.length === 0) {
                            error = 'No matching friends found.';
                        }

                        return { steamID, commonFriends, error };
                    } catch (error) {
                        console.error('Error fetching friend list:', error);
                        return { steamID, commonFriends: [], error: 'Private profile' };
                    }
                }));

                const responseArray = results.map(({ steamID, commonFriends, error }) => {
                    const profileLink = `https://steamcommunity.com/profiles/${steamID}`;
                    const matchingIDs = commonFriends.filter((friendID) => friendID !== steamID);
                    const matchingIDsText = error !== '' ? error : `This user is friends with --> ${matchingIDs.map(id => `[${id}](<https://steamcommunity.com/profiles/${id}>)`).join(', ')}`;
                    return `[${steamID}](<${profileLink}>) - ${matchingIDsText}`;
                });

                const botResponse = await message.channel.send(responseArray.join('\n'));

             //   setTimeout(() => {
             //       message.delete().catch(console.error);
             //       botResponse.delete().catch(console.error);
             //   }, 1 * 60 * 1000);
            } else {
                const botResponse = await message.channel.send('Please provide 2 or more valid Steam64 IDs.');

              //  setTimeout(() => {
               //     message.delete().catch(console.error);
               //     botResponse.delete().catch(console.error);
               // }, 1 * 60 * 1000);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        message.channel.send('There was an error processing the request.');
    }
});


client.on('messageCreate', async (message) => {
    try {
        if (message.content === '!resetchannels' && message.channel.name === 'config-settings') {
            const guild = client.guilds.cache.get(message.guild.id);

            
            let category = guild.channels.cache.find(channel => channel.type === ChannelType.GuildCategory && channel.name === 'Cobra');
            
            if (!category) {
                
                category = await guild.channels.create({
                    type: ChannelType.GuildCategory,
                    name: 'Cobra',
                });
            }
            
            
            const channelsToCreate = [
                { name: 'steam-urls', type: ChannelType.GuildText },
                { name: 'friends', type: ChannelType.GuildText },
                { name: 'eac-ban-search', type: ChannelType.GuildText },
                { name: 'config-settings', type: ChannelType.GuildText }
                // Add more channels as needed
            ];

            for (const channelData of channelsToCreate) {
                const existingChannel = guild.channels.cache.find(ch => ch.type === ChannelType.GuildText && ch.name === channelData.name && ch.parentId === category.id);

                if (!existingChannel) {
                    
                    const newChannel = await guild.channels.create({
                        type: channelData.type,
                        name: channelData.name,
                        parent: category.id 
                        
                    });

                    const messagesToSend = [
                        {channelName: 'steam-urls', message: '**Info**\nThis channel will take a Steam profile link and return the SteamID64.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**How to use**\n1. Get a Steam profile link.\n2. Send the Steam profile link in this channel and the bot will return the Steam64ID associated with that account.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**Not working?**\nContact Morty\n--------------------------------------------------------------------------------------------------------------------------------------------------'},
                        {channelName: 'friends', message: '**Info**\nThis channel takes multiple steam64IDs and returns the common friends associated with the accounts.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**How to use**\n1. Get the players steam64ID from steamid.io or use #steam-urls\n2. Send the steam64IDs in this channel.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**Not working?**\nContact Morty\n--------------------------------------------------------------------------------------------------------------------------------------------------'},
                        {channelName: 'eac-ban-search', message: '**Info**\nThis channel takes a Steam64ID and searches a database of **000000** Rust bans to see if the player has been banned in Rust.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**How to use**\n1. Get the players Steam64ID from a website like steamid.io or use #steam-urls.\n2. Put the steam64ID in here and the bot will return with the results.\n--------------------------------------------------------------------------------------------------------------------------------------------------\n**Not working?**\nContact Morty | Note: this isnt working as of now. This is a placeholder.\n--------------------------------------------------------------------------------------------------------------------------------------------------'},
                        {channelName: 'config-settings', message: '**Info**\nThis is for testing. Do __!list__ to see the available commands\n--------------------------------------------------------------------------------------------------------------------------------------------------'},
                        // Add more channels and messages as needed
                    ];

                    for (const { channelName, message } of messagesToSend) {
                        const channel = guild.channels.cache.find(
                            (ch) => ch.type === ChannelType.GuildText && ch.name === channelName
                        );

                        if (channel) {
                            if (!sentMessages[channel.id]) {
                                try {
                                    await channel.send(message);
                                    console.log(`Sent message to ${channelName} channel.`);
                                    sentMessages[channel.id] = true;
                                } catch (error) {
                                    console.error(`Error sending message to ${channelName} channel:`, error);
                                }
                            } else {
                                console.log(`Message already sent to ${channelName} channel.`);
                            }
                        } else {
                            console.error(`Channel '${channelName}' not found.`);
                        }
                    }

                    
                    fs.writeFileSync(sentMessagesFile, JSON.stringify(sentMessages, null, 2), 'utf8');
                } else {
                    console.log(`Channel '${existingChannel.name}' already exists in category '${category.name}'`);
                }
            }

            message.channel.send('Channels reset successfully.');
        }
    } catch (error) {
        console.error('Error resetting channels:', error);
        message.channel.send('There was an error resetting the channels.');
    }
});



client.login(process.env.Bottoken);