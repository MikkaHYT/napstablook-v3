import 'dotenv/config';
import { Client, Collection, Events, GatewayIntentBits, Partials } from 'discord.js';
import { commands } from './commands/index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();
const subscriptions = new Map();
const statusUrl = process.env.MINECRAFT_STATUS_ENDPOINT;
const STATUS_REFRESH_MS = 25_000;
let presenceInterval;

for (const command of commands) {
  client.commands.set(command.data.name, command);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (message.channel.name !== 'napstablook') return;

  try {
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: 'System Prompt: You are a Discord bot called napstablook that is there to aid the user with any questions they may have at all.' }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I am Napstablook, a helpful Discord bot ready to assist users with their questions.' }],
        },
      ],
    });

    const result = await chat.sendMessage(message.content);
    const response = await result.response;
    const text = response.text();

    await message.reply(text);
  } catch (error) {
    console.error('Error interacting with Gemini API:', error);
    await message.reply('Oh no... something went wrong... sorry...');
  }
});

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  if (!statusUrl) {
    return;
  }

  const updatePresence = async () => {
    let timeout;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 10_000);
      const response = await fetch(statusUrl, { cache: 'no-store', signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Status API responded with ${response.status}`);
      }

      const data = await response.json();
      const isOnline = Boolean(data?.online);
      const onlinePlayers = data?.players?.online ?? 0;
      const maxPlayers = data?.players?.max ?? 0;
      const activityName = isOnline
        ? `Minecraft: ${onlinePlayers}/${maxPlayers} online`
        : 'Minecraft server offline';

      await readyClient.user.setPresence({
        activities: [{ name: activityName }],
        status: isOnline ? 'online' : 'idle'
      });
    } catch (error) {
      console.error('Failed to update Minecraft server presence', error);
      await readyClient.user.setPresence({
        activities: [{ name: 'Minecraft status unavailable' }],
        status: 'dnd'
      });
    }
    finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  };

  updatePresence();
  presenceInterval = setInterval(updatePresence, STATUS_REFRESH_MS);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.warn(`No command registered for ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction, subscriptions);
  } catch (error) {
    console.error(`Command ${interaction.commandName} failed:`, error);

    const content = 'There was an error while executing this command.';

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(content);
    } else if (interaction.isRepliable()) {
      await interaction.reply({ content, ephemeral: true });
    }
  }
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Missing DISCORD_TOKEN in environment. Set it in your .env file.');
  process.exit(1);
}

client.login(token).catch(error => {
  console.error('Failed to login. Please verify your DISCORD_TOKEN.', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  for (const subscription of subscriptions.values()) {
    subscription.destroy();
  }
  if (presenceInterval) {
    clearInterval(presenceInterval);
  }
  client.destroy();
  process.exit(0);
});
