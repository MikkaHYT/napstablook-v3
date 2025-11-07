import { SlashCommandBuilder } from 'discord.js';
import {
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel
} from '@discordjs/voice';
import { MusicSubscription } from '../music/subscription.js';
import { Track } from '../music/track.js';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song from a URL or search query.')
  .addStringOption(option =>
    option
      .setName('query')
      .setDescription('URL or search term for the song you want to hear.')
      .setRequired(true)
  );

export async function execute(interaction, subscriptions) {
  const query = interaction.options.getString('query', true);
  const memberChannel = interaction.member?.voice?.channel;

  if (!memberChannel) {
    await interaction.reply({
      content: 'You need to join a voice channel before using this command.',
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply();

  let subscription = subscriptions.get(interaction.guildId);

  if (!subscription) {
    const connection = joinVoiceChannel({
      channelId: memberChannel.id,
      guildId: memberChannel.guild.id,
      adapterCreator: memberChannel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    subscription = new MusicSubscription(connection);
    subscriptions.set(interaction.guildId, subscription);

    subscription.voiceConnection.on('stateChange', (_, newState) => {
      if (newState.status === VoiceConnectionStatus.Destroyed) {
        subscriptions.delete(interaction.guildId);
      }
    });
  } else if (subscription.voiceConnection.joinConfig.channelId !== memberChannel.id) {
    subscription.voiceConnection.rejoin({
      channelId: memberChannel.id,
      guildId: memberChannel.guild.id,
      adapterCreator: memberChannel.guild.voiceAdapterCreator,
      selfDeaf: false
    });
  }

  try {
    await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
  } catch (error) {
    subscription.destroy();
    subscriptions.delete(interaction.guildId);
    await interaction.editReply(
      'Failed to join the voice channel. Please try again or move the bot to a valid channel.'
    );
    return;
  }

  try {
    const track = await Track.from(query, interaction.user.tag);
    await subscription.enqueue(track);

    await interaction.editReply(
      `Queued **${track.title}** (${track.displayDuration()}) requested by ${track.requestedBy}.`
    );
  } catch (error) {
    console.error('Failed to queue track:', error);
    await interaction.editReply('I could not find or play that track. Please try another query.');
  }
}
