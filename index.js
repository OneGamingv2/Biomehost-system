import {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField,
    AttachmentBuilder,
} from 'discord.js';
import {
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    AudioPlayerStatus,
    StreamType,
} from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import fs from 'fs';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ],
});

const token = "";
const clientId = "";

const commands = [
    { name: 'help', description: 'Show available commands' },
    { name: 'play', description: 'Play a YouTube video', options: [{ name: 'url', type: 3, description: 'YouTube URL', required: true }] },
    { name: 'stop', description: 'Stop playback and clear queue' },
    { name: 'skip', description: 'Skip to the next song' },
    { name: 'pause', description: 'Pause playback' },
    { name: 'resume', description: 'Resume playback' },
    { name: 'volume', description: 'Set playback volume', options: [{ name: 'level', type: 10, description: 'Volume level (0-100)', required: true }] },
    { name: 'ban', description: 'Ban a user', options: [{ name: 'user', type: 6, description: 'User to ban', required: true }, { name: 'reason', type: 3, description: 'Reason for ban', required: false }] },
    { name: 'kick', description: 'Kick a user', options: [{ name: 'user', type: 6, description: 'User to kick', required: true }] },
    { name: 'mute', description: 'Mute a user', options: [{ name: 'user', type: 6, description: 'User to mute', required: true }] },
    { name: 'unmute', description: 'Unmute a user', options: [{ name: 'user', type: 6, description: 'User to unmute', required: true }] },
    { name: 'clear', description: 'Delete messages', options: [{ name: 'count', type: 4, description: 'Number of messages (max 100)', required: true }] },
    { name: 'muterole', description: 'Set the mute role', options: [{ name: 'role', type: 8, description: 'The mute role', required: true }] },
    { name: 'logschannel', description: 'Set the logs channel', options: [{ name: 'channel', type: 7, description: 'Channel to log bot events', required: true }] },
    { name: 'ticket', description: 'Create a support ticket' },
    { name: 'ticketchannel', description: 'Set the ticket category', options: [{ name: 'category', type: 7, description: 'Category for tickets', required: true }] },
    { name: 'welcomechannel', description: 'Set the welcome channel', options: [{ name: 'channel', type: 7, description: 'Channel to send welcome messages', required: true }] },
    { name: 'welcomemessage', description: 'Set the welcome message', options: [{ name: 'message', type: 3, description: 'Welcome message text', required: true }] },
    { name: 'listguilds', description: 'List all guilds the bot is in and DM them the list' },
    { name: 'guildinvite', description: 'Generate an invite for a guild by server ID', options: [{ name: 'server-id', type: 3, description: 'The guild/server ID', required: true }] }
];

let queue = [];
const player = createAudioPlayer();
let connection = null;
let volume = 1.0; // Default volume level
let muteRoleId = null;
let logsChannelId = null;
let welcomeChannelId = null;
let ticketCount = 0; // Counter for ticket numbers
let ticketCategoryId = null; // ID of the ticket category
let welcomeMessage = "Welcome to the server, {user}!"; // Default welcome message

// File paths
const logsChannelFilePath = './logsChannels.txt';
const muteRoleFilePath = './muteRole.txt';
const welcomeChannelFilePath = './welcomeChannel.txt';
const welcomeMessageFilePath = './welcomeMessage.txt';
const ticketCategoryFilePath = './ticketCategory.txt';

// Load logs channel ID from file
if (fs.existsSync(logsChannelFilePath)) {
    logsChannelId = fs.readFileSync(logsChannelFilePath, 'utf8').trim();
}

// Load mute role ID from file
if (fs.existsSync(muteRoleFilePath)) {
    muteRoleId = fs.readFileSync(muteRoleFilePath, 'utf8').trim();
}

// Load welcome channel ID from file
if (fs.existsSync(welcomeChannelFilePath)) {
    welcomeChannelId = fs.readFileSync(welcomeChannelFilePath, 'utf8').trim();
}

// Load welcome message from file
if (fs.existsSync(welcomeMessageFilePath)) {
    welcomeMessage = fs.readFileSync(welcomeMessageFilePath, 'utf8').trim();
}

// Load ticket category ID from file
if (fs.existsSync(ticketCategoryFilePath)) {
    ticketCategoryId = fs.readFileSync(ticketCategoryFilePath, 'utf8').trim();
}

// Save logs channel ID to file
function saveLogsChannelId() {
    fs.writeFileSync(logsChannelFilePath, logsChannelId);
}

// Save mute role ID to file
function saveMuteRoleId() {
    fs.writeFileSync(muteRoleFilePath, muteRoleId);
}

// Save welcome channel ID to file
function saveWelcomeChannelId() {
    fs.writeFileSync(welcomeChannelFilePath, welcomeChannelId);
}

// Save welcome message to file
function saveWelcomeMessage() {
    fs.writeFileSync(welcomeMessageFilePath, welcomeMessage);
}

// Save ticket category ID to file
function saveTicketCategoryId() {
    fs.writeFileSync(ticketCategoryFilePath, ticketCategoryId);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Registering application (/) commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
})();

// Helper function to check if user is admin or the owner (username "onegamingv2")
function isAdminOrOwner(interaction) {
    return (interaction.user.username === "onegamingv2") ||
           (interaction.memberPermissions && interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator));
}

// Combined event listener for commands and buttons
client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        const { commandName, options, member, guild, user } = interaction;

        try {
            switch (commandName) {
                case 'help': {
                    const helpMessage = commands.map(cmd => `**/${cmd.name}** - ${cmd.description}`).join("\n");
                    await interaction.reply({ content: `📜 **Available Commands:**\n${helpMessage}`, ephemeral: true });
                    logEvent(`Help command used by ${user.tag}`);
                    break;
                }
                case 'play': {
                    const url = options.getString('url');
                    const voiceChannel = member.voice.channel;
                    if (!voiceChannel) return interaction.reply({ content: 'You must be in a voice channel.', ephemeral: true });

                    queue.push(url);
                    await interaction.reply({ content: `Added to queue: ${url}`, ephemeral: true });
                    logEvent(`Play command used by ${user.tag} with URL: ${url}`);

                    if (!connection) {
                        connection = joinVoiceChannel({
                            channelId: voiceChannel.id,
                            guildId: voiceChannel.guild.id,
                            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                        });
                        playNextSong();
                    }
                    break;
                }
                case 'stop':
                    queue = [];
                    player.stop();
                    connection?.destroy();
                    connection = null;
                    await interaction.reply({ content: 'Playback stopped.', ephemeral: true });
                    logEvent(`Stop command used by ${user.tag}`);
                    break;
                case 'skip':
                    player.stop();
                    await interaction.reply({ content: 'Skipped to next song.', ephemeral: true });
                    logEvent(`Skip command used by ${user.tag}`);
                    break;
                case 'pause':
                    player.pause();
                    await interaction.reply({ content: 'Paused playback.', ephemeral: true });
                    logEvent(`Pause command used by ${user.tag}`);
                    break;
                case 'resume':
                    player.unpause();
                    await interaction.reply({ content: 'Resumed playback.', ephemeral: true });
                    logEvent(`Resume command used by ${user.tag}`);
                    break;
                case 'volume': {
                    volume = options.getNumber('level') / 100;
                    if (player.state.resource) {
                        player.state.resource.volume.setVolume(volume);
                    }
                    await interaction.reply({ content: `Volume set to ${volume * 100}%`, ephemeral: true });
                    logEvent(`Volume command used by ${user.tag} with level: ${volume * 100}%`);
                    break;
                }
                case 'ban': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    const targetUser = options.getUser('user');
                    const reason = options.getString('reason') || 'No reason provided';
                    try {
                        await targetUser.send(`You have been banned from ${guild.name}. Reason: ${reason}`);
                    } catch (error) {
                        console.error("Could not send DM to the user:", error);
                    }
                    try {
                        await guild.members.ban(targetUser, { reason });
                        await interaction.reply({ content: `${targetUser.tag} has been banned. Reason: ${reason}`, ephemeral: true });
                        logEvent(`Ban command used by ${user.tag} to ban ${targetUser.tag}. Reason: ${reason}`);
                    } catch (error) {
                        console.error("Ban error:", error);
                        await interaction.reply({ content: "Could not ban the user. Check bot permissions.", ephemeral: true });
                    }
                    break;
                }
                case 'kick': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    const targetUser = options.getUser('user');
                    try {
                        await targetUser.send(`You have been kicked from ${guild.name}.`);
                    } catch (error) {
                        console.error("Could not send DM to the user:", error);
                    }
                    try {
                        await guild.members.kick(targetUser);
                        await interaction.reply({ content: `${targetUser.tag} has been kicked.`, ephemeral: true });
                        logEvent(`Kick command used by ${user.tag} to kick ${targetUser.tag}`);
                    } catch (error) {
                        console.error("Kick error:", error);
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp({ content: "Could not kick the user. Check bot permissions.", ephemeral: true });
                        } else {
                            await interaction.reply({ content: "Could not kick the user. Check bot permissions.", ephemeral: true });
                        }
                    }
                    break;
                }
                case 'mute': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    const targetMember = options.getMember('user');
                    if (!muteRoleId)
                        return interaction.reply({ content: 'Use /muterole to set a mute role first.', ephemeral: true });
                    try {
                        await targetMember.roles.add(muteRoleId);
                        await interaction.reply({ content: `${targetMember.user.tag} has been muted.`, ephemeral: true });
                        logEvent(`Mute command used by ${user.tag} to mute ${targetMember.user.tag}`);
                    } catch (error) {
                        console.error("Mute error:", error);
                        await interaction.reply({ content: "Could not mute the user. Check bot permissions.", ephemeral: true });
                    }
                    break;
                }
                case 'unmute': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    const targetMember = options.getMember('user');
                    if (!muteRoleId)
                        return interaction.reply({ content: 'Use /muterole to set a mute role first.', ephemeral: true });
                    try {
                        await targetMember.roles.remove(muteRoleId);
                        await interaction.reply({ content: `${targetMember.user.tag} has been unmuted.`, ephemeral: true });
                        logEvent(`Unmute command used by ${user.tag} to unmute ${targetMember.user.tag}`);
                    } catch (error) {
                        console.error("Unmute error:", error);
                        await interaction.reply({ content: "Could not unmute the user. Check bot permissions.", ephemeral: true });
                    }
                    break;
                }
                case 'clear': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    let count = options.getInteger('count');
                    // Clamp the count to a maximum of 100
                    if (count > 100) count = 100;
                    try {
                        const messages = await interaction.channel.messages.fetch({ limit: count });
                        await interaction.channel.bulkDelete(messages);
                        await interaction.reply({ content: `Deleted ${count} messages.`, ephemeral: true });
                        logEvent(`Clear command used by ${user.tag} to delete ${count} messages`);
                    } catch (error) {
                        console.error("Clear error:", error);
                        await interaction.reply({ content: "Could not clear messages. Check bot permissions.", ephemeral: true });
                    }
                    break;
                }
                case 'muterole': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    const role = options.getRole('role');
                    muteRoleId = role.id;
                    saveMuteRoleId();
                    await interaction.reply({ content: `Mute role set to ${role.name}.`, ephemeral: true });
                    logEvent(`Muterole command used by ${user.tag} to set mute role to ${role.name}`);
                    break;
                }
                case 'logschannel': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    const channel = options.getChannel('channel');
                    logsChannelId = channel.id;
                    saveLogsChannelId();
                    await interaction.reply({ content: `Logs channel set to ${channel.name}.`, ephemeral: true });
                    logEvent(`Logschannel command used by ${user.tag} to set logs channel to ${channel.name}`);
                    break;
                }
                case 'welcomechannel': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    const channel = options.getChannel('channel');
                    welcomeChannelId = channel.id;
                    saveWelcomeChannelId();
                    await interaction.reply({ content: `Welcome channel set to ${channel.name}.`, ephemeral: true });
                    logEvent(`Welcomechannel command used by ${user.tag} to set welcome channel to ${channel.name}`);
                    break;
                }
                case 'welcomemessage': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    welcomeMessage = options.getString('message');
                    saveWelcomeMessage();
                    await interaction.reply({ content: `Welcome message set to: ${welcomeMessage}`, ephemeral: true });
                    logEvent(`Welcomemessage command used by ${user.tag} to set welcome message to: ${welcomeMessage}`);
                    break;
                }
                case 'ticketchannel': {
                    if (!isAdminOrOwner(interaction)) {
                        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                    }
                    const category = options.getChannel('category');
                    if (category.type !== ChannelType.GuildCategory) {
                        return interaction.reply({ content: 'The specified channel must be a category.', ephemeral: true });
                    }
                    ticketCategoryId = category.id;
                    saveTicketCategoryId();
                    await interaction.reply({ content: `Ticket category set to ${category.name}.`, ephemeral: true });
                    logEvent(`Ticketchannel command used by ${user.tag} to set ticket category to ${category.name}`);
                    break;
                }
                case 'ticket': {
                    // Allow normal users to create tickets.
                    if (!ticketCategoryId) {
                        return interaction.reply({ content: 'Please set a ticket category using /ticketchannel first.', ephemeral: true });
                    }
                    const ticketCategory = guild.channels.cache.get(ticketCategoryId);
                    if (!ticketCategory || ticketCategory.type !== ChannelType.GuildCategory) {
                        return interaction.reply({ content: 'Ticket category does not exist. Please set a valid ticket category using /ticketchannel.', ephemeral: true });
                    }
                    ticketCount++;
                    const channelName = `ticket-${ticketCount}`;
                    try {
                        const newChannel = await guild.channels.create({
                            name: channelName,
                            type: ChannelType.GuildText,
                            parent: ticketCategoryId,
                            permissionOverwrites: [
                                {
                                    id: guild.id,
                                    deny: [PermissionsBitField.Flags.ViewChannel],
                                },
                                {
                                    id: user.id,
                                    allow: [
                                        PermissionsBitField.Flags.ViewChannel,
                                        PermissionsBitField.Flags.SendMessages,
                                        PermissionsBitField.Flags.ReadMessageHistory,
                                    ],
                                },
                                {
                                    id: client.user.id,
                                    allow: [
                                        PermissionsBitField.Flags.ViewChannel,
                                        PermissionsBitField.Flags.SendMessages,
                                        PermissionsBitField.Flags.ReadMessageHistory,
                                        PermissionsBitField.Flags.ManageChannels,
                                    ],
                                },
                            ],
                        });
                        const closeButton = new ButtonBuilder()
                            .setCustomId('close-ticket')
                            .setLabel('Close Ticket')
                            .setStyle(ButtonStyle.Danger);
    
                        const row = new ActionRowBuilder().addComponents(closeButton);
    
                        await newChannel.send({
                            content: `Welcome to your ticket, ${user}!  Please describe your issue.`,
                            components: [row],
                        });
                        await interaction.reply({ content: `Ticket #${ticketCount} created! ${newChannel}`, ephemeral: true });
                        logEvent(`Ticket #${ticketCount} created by ${user.tag}`);
                    } catch (error) {
                        console.error("Ticket creation error:", error);
                        await interaction.reply({ content: "Failed to create ticket. Check bot permissions.", ephemeral: true });
                    }
                    break;
                }
                case 'listguilds': {
                    // Build the guild list and save to a file.
                    const guildList = client.guilds.cache.map(g => `${g.name} (ID: ${g.id})`).join('\n');
                    const filePath = './guilds.txt';
                    fs.writeFileSync(filePath, guildList);
    
                    // Create an attachment using AttachmentBuilder.
                    const attachment = new AttachmentBuilder(filePath);
    
                    try {
                        // Attempt to DM the user the guild list.
                        await user.send({
                            content: 'Here is the list of guilds the bot is in:',
                            files: [attachment],
                        });
                        await interaction.reply({ content: 'I have DM\'d you the list of guilds.', ephemeral: true });
                        logEvent(`Listguilds command used by ${user.tag}. Saved ${client.guilds.cache.size} guilds and DM'd them.`);
                    } catch (dmError) {
                        console.error("Could not DM user:", dmError);
                        await interaction.reply({ content: 'I could not DM you the list. Do you have DMs disabled?', ephemeral: true });
                    }
                    break;
                }
                case 'guildinvite': {
                    // Get the server ID from the command option.
                    const serverId = options.getString('server-id');
                    const targetGuild = client.guilds.cache.get(serverId);
                    if (!targetGuild) {
                        return interaction.reply({ content: `Guild with ID "${serverId}" not found.`, ephemeral: true });
                    }
                    // Find a text channel where the bot can create an invite.
                    const targetChannel = targetGuild.channels.cache.find(ch =>
                        ch.type === ChannelType.GuildText &&
                        ch.permissionsFor(client.user).has(PermissionsBitField.Flags.CreateInstantInvite)
                    );
                    if (!targetChannel) {
                        return interaction.reply({ content: "Couldn't find a channel to create an invite in that guild.", ephemeral: true });
                    }
                    try {
                        const invite = await targetChannel.createInvite({ maxAge: 0, maxUses: 0 });
                        await interaction.reply({ content: `Invite for **${targetGuild.name}**: ${invite.url}`, ephemeral: true });
                        logEvent(`Guildinvite command used by ${user.tag} for guild ${targetGuild.name} (${serverId})`);
                    } catch (error) {
                        console.error("Guild invite error:", error);
                        await interaction.reply({ content: "Failed to create an invite for that guild.", ephemeral: true });
                    }
                    break;
                }
                default:
                    await interaction.reply({ content: 'Unknown command.', ephemeral: true });
                    logEvent(`Unknown command used by ${user.tag}`);
            }
        } catch (error) {
            console.error('Command execution error:', error);
            await interaction.reply({ content: `Error executing command: ${error.message}`, ephemeral: true });
            logEvent(`Error executing command by ${user.tag}: ${error.message}`);
        }
    } else if (interaction.isButton()) {
        // Handle button interactions (e.g., closing tickets)
        if (interaction.customId === 'close-ticket') {
            if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({ content: "You do not have permission to close this ticket.", ephemeral: true });
            }
            const channelName = interaction.channel?.name || 'Unknown Channel';
            try {
                await interaction.channel.delete();
                logEvent(`Ticket ${channelName} closed by ${interaction.user.tag}`);
            } catch (error) {
                console.error("Ticket deletion error:", error);
                await interaction.reply({ content: "Failed to close the ticket. Check bot permissions.", ephemeral: true });
                logEvent(`Failed to close ticket ${channelName} by ${interaction.user.tag}: ${error.message}`);
            }
        }
    }
});

client.on('guildMemberAdd', (member) => {
    if (welcomeChannelId) {
        const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
        if (welcomeChannel && welcomeChannel.isTextBased()) {
            const message = welcomeMessage.replace('{user}', member);
            try {
                welcomeChannel.send(message);
            } catch (error) {
                console.error('Error sending welcome message:', error);
            }
        }
    }
});

async function playNextSong() {
    if (queue.length === 0) {
        connection?.destroy();
        connection = null;
        return;
    }
    const url = queue.shift();
    try {
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
        const resource = createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
        });
        resource.volume.setVolume(volume);
        player.play(resource);
        connection.subscribe(player);
        player.once(AudioPlayerStatus.Idle, () => playNextSong());
    } catch (error) {
        console.error("Error playing song:", error);
        logEvent(`Error playing song: ${error.message}`);
        playNextSong();
    }
}

// Improved logEvent function
function logEvent(message) {
    if (!logsChannelId) return;
    const logsChannel = client.channels.cache.get(logsChannelId);
    if (!logsChannel) {
        console.error(`Log channel with ID ${logsChannelId} not found.`);
        return;
    }
    logsChannel.send(message).catch(error => {
        console.error(`Failed to log event: ${error}`);
    });
}

client.login(token);