import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop the music and clear the queue.');

export async function execute(interaction, subscriptions) {
  const subscription = subscriptions.get(interaction.guildId);

  if (!subscription) {
    await interaction.reply({
      content: 'I am not connected to a voice channel right now.',
      ephemeral: true
    });
    return;
  }

  subscription.destroy();
  subscriptions.delete(interaction.guildId);

  await interaction.reply('Stopped playback and cleared the queue.');
}
