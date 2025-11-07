import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the currently playing song.');

export async function execute(interaction, subscriptions) {
  const subscription = subscriptions.get(interaction.guildId);

  if (!subscription) {
    await interaction.reply({
      content: 'Nothing is playing right now.',
      ephemeral: true
    });
    return;
  }

  const skipped = subscription.skip();

  if (!skipped) {
    await interaction.reply({ content: 'There is no track to skip.', ephemeral: true });
    return;
  }

  await interaction.reply('Skipped the current track.');
}
