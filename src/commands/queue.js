import { SlashCommandBuilder } from 'discord.js';

const formatQueueLine = (track, index) => `${index + 1}. ${track.title} (${track.displayDuration()}) — requested by ${track.requestedBy}`;

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('View the current music queue.');

export async function execute(interaction, subscriptions) {
  const subscription = subscriptions.get(interaction.guildId);

  if (!subscription || (!subscription.currentTrack && subscription.queue.length === 0)) {
    await interaction.reply('The queue is empty. Use `/play` to add a song.');
    return;
  }

  const currentlyPlaying = subscription.currentTrack
    ? `Now playing: **${subscription.currentTrack.title}** (${subscription.currentTrack.displayDuration()})`
    : 'Nothing playing right now.';

  const queueLines = subscription.queue.map((track, index) => formatQueueLine(track, index));
  const queueMessage = [currentlyPlaying, '', queueLines.join('\n')].filter(Boolean).join('\n');

  await interaction.reply(queueMessage);
}
