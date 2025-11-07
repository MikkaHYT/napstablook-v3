import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('DISCORD_TOKEN and CLIENT_ID must be set in your environment.');
  process.exit(1);
}

const rest = new REST().setToken(token);
const commandPayload = commands.map(command => command.data.toJSON());

(async () => {
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commandPayload
      });
      console.log(`Registered ${commandPayload.length} guild command(s) for guild ${guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commandPayload
      });
      console.log(`Registered ${commandPayload.length} global command(s).`);
    }
  } catch (error) {
    console.error('Failed to register slash commands:', error);
    process.exitCode = 1;
  }
})();
