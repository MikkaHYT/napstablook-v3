import { SlashCommandBuilder } from 'discord.js';


export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Check the status of the modded Minecraft server.');

export async function execute(interaction) {
  await interaction.deferReply();

    try {
        const res = await fetch('https://api.mcsrvstat.us/2/mikkahyt2.aternos.me', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Status API returned ${res.status}`);
        const data = await res.json();

        if (data && data.online) {
            const players = data.players?.online ?? 'unknown';
            const maxPlayers = data.players?.max ?? 'unknown';
            const version = data.version ?? 'unknown';
            const mods = data.mods?.names?.join(', ') || 'No mods';
            const playerNames = data.players?.list?.join(', ') || 'No players online';
            await interaction.editReply(
                `Server is online.\nVersion: ${version}\nPlayers: ${players}/${maxPlayers}\nPlayer List: ${playerNames}\n\nMods: ${mods}\n`
            );
        } else {
            await interaction.editReply('Server is currently offline. Use `/start` to start the server.');
        }
    } catch (error) {
        await interaction.editReply(`Could not check server status: ${error.message}`);
    }
}
