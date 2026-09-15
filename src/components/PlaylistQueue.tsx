import React, { useState } from 'react';
import { 
  Music, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Link as LinkIcon, 
  Play, 
  ListMusic, 
  Sparkles,
  ExternalLink,
  Check
} from 'lucide-react';
import { Song, KaraokeState } from '../types';
import { POPULAR_KARAOKE_SONGS, SongPreset } from '../data/popularSongs';

interface PlaylistQueueProps {
  karaokeState: KaraokeState;
  isHost: boolean;
  localUserId: string;
  localUserName: string;
  onAddSong: (song: Omit<Song, 'id' | 'addedAt'>) => void;
  onRemoveSong: (songId: string) => void;
  onReorderPlaylist: (newPlaylist: Song[]) => void;
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  onOpenAddModal: () => void;
}

export const PlaylistQueue: React.FC<PlaylistQueueProps> = ({
  karaokeState,
  isHost,
  localUserId,
  localUserName,
  onAddSong,
  onRemoveSong,
  onReorderPlaylist,
  isAddModalOpen,
  onCloseAddModal,
  onOpenAddModal,
}) => {
  const [activeTab, setActiveTab] = useState<'preset' | 'url'>('preset');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [previewSong, setPreviewSong] = useState<{
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const playlist = karaokeState.playlist;
  const currentSong = karaokeState.currentSong;

  // Filter curated presets
  const categories = ['Semua', 'Indo Hits', 'Pop Barat', 'Rock & Nostalgia'];
  const filteredPresets = POPULAR_KARAOKE_SONGS.filter((song) => {
    const matchesCategory = selectedCategory === 'Semua' || song.category === selectedCategory;
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Fetch YouTube Metadata for custom URL / ID
  const handleCheckYoutube = async () => {
    if (!youtubeInput.trim()) return;
    setIsLoadingMeta(true);
    setErrorMessage('');
    setPreviewSong(null);

    try {
      const res = await fetch(`/api/youtube/info?query=${encodeURIComponent(youtubeInput.trim())}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMessage(data.error || 'Gagal memuat info video YouTube.');
      } else {
        setPreviewSong(data);
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat memeriksa tautan YouTube.');
    } finally {
      setIsLoadingMeta(false);
    }
  };

  // Add custom song from preview
  const handleAddCustomSong = () => {
    if (!previewSong) return;
    onAddSong({
      videoId: previewSong.videoId,
      title: previewSong.title,
      channelTitle: previewSong.channelTitle,
      thumbnail: previewSong.thumbnail,
      addedBy: localUserId,
      addedByName: localUserName,
    });
    setAddedNotice(`Lagu "${previewSong.title}" ditambahkan!`);
    setTimeout(() => setAddedNotice(null), 3000);
    setYoutubeInput('');
    setPreviewSong(null);
  };

  // Add preset song
  const handleAddPresetSong = (preset: SongPreset) => {
    onAddSong({
      videoId: preset.videoId,
      title: preset.title,
      artist: preset.artist,
      thumbnail: `https://img.youtube.com/vi/${preset.videoId}/hqdefault.jpg`,
      duration: preset.duration,
      addedBy: localUserId,
      addedByName: localUserName,
    });
    setAddedNotice(`Lagu "${preset.title}" ditambahkan ke antrean!`);
    setTimeout(() => setAddedNotice(null), 3000);
  };

  // Move song in queue
  const moveSong = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= playlist.length) return;
    const updated = [...playlist];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    onReorderPlaylist(updated);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-pink-400" />
          <h2 className="text-sm font-bold text-white">Antrean Playlist Karaoke</h2>
          <span className="bg-pink-500/20 text-pink-400 text-xs px-2 py-0.5 rounded-full font-semibold">
            {playlist.length} lagu
          </span>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Lagu</span>
        </button>
      </div>

      {/* Currently Playing Card */}
      <div className="mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
          Sedang Diputar
        </span>
        {currentSong ? (
          <div className="bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/30 rounded-xl p-2.5 flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-pink-500/30">
              <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-pink-600/20 flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-current animate-pulse" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentSong.title}</p>
              <p className="text-[11px] text-pink-300/80 truncate">
                {currentSong.artist || currentSong.channelTitle || 'Karaoke Track'}
              </p>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Ditambahkan oleh: <span className="text-slate-300 font-medium">{currentSong.addedByName}</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-3 text-center text-xs text-slate-500">
            Tidak ada lagu yang sedang diputar.
          </div>
        )}
      </div>

      {/* Upcoming Queue List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
          Berikutnya ({playlist.length})
        </span>

        {playlist.length === 0 ? (
          <div className="text-center py-6 px-3 text-slate-500 text-xs">
            <Music className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <p>Antrean lagu masih kosong.</p>
            <p className="text-[11px] text-slate-600 mt-1">Pilih lagu YouTube bersama teman untuk dinyanyikan selanjutnya!</p>
          </div>
        ) : (
          playlist.map((song, index) => (
            <div
              key={song.id}
              className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-2 flex items-center justify-between gap-2 text-xs transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-5 text-center font-mono text-slate-500 text-xs font-semibold shrink-0">
                  {index + 1}
                </span>
                <img
                  src={song.thumbnail}
                  alt={song.title}
                  className="w-10 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-200 truncate">{song.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {song.addedByName} {song.artist ? `• ${song.artist}` : ''}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                <button
                  onClick={() => moveSong(index, 'up')}
                  disabled={index === 0}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20"
                  title="Pindah ke Atas"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveSong(index, 'down')}
                  disabled={index === playlist.length - 1}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20"
                  title="Pindah ke Bawah"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRemoveSong(song.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                  title="Hapus dari antrean"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Tambah Lagu YouTube Karaoke */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pilih Lagu Karaoke YouTube</h3>
                  <p className="text-[11px] text-slate-400">Pilih dari katalog populer atau masukkan link YouTube sendiri</p>
                </div>
              </div>
              <button
                onClick={onCloseAddModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Notification Toast */}
            {addedNotice && (
              <div className="bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs px-4 py-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{addedNotice}</span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/50">
              <button
                onClick={() => setActiveTab('preset')}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'preset'
                    ? 'border-pink-500 text-pink-400 bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Katalog Karaoke Populer
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'url'
                    ? 'border-pink-500 text-pink-400 bg-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Tempel Link / ID YouTube
              </button>
            </div>

            {/* Tab 1: Presets Catalog */}
            {activeTab === 'preset' && (
              <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
                {/* Search & Category filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari judul lagu atau penyanyi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[11px] px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-pink-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Presets Grid */}
                <div className="space-y-2 overflow-y-auto flex-1 max-h-[340px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {filteredPresets.map((preset) => (
                    <div
                      key={preset.videoId}
                      className="bg-slate-950 border border-slate-800 hover:border-pink-500/50 rounded-xl p-2.5 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={`https://img.youtube.com/vi/${preset.videoId}/hqdefault.jpg`}
                          alt={preset.title}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{preset.title}</p>
                          <p className="text-[11px] text-pink-400 truncate">{preset.artist}</p>
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                            {preset.category}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddPresetSong(preset)}
                        className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Pilih</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 2: Custom YouTube URL / ID */}
            {activeTab === 'url' && (
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tautan Video atau ID YouTube:
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Contoh: https://www.youtube.com/watch?v=qC8eHn7oZzA atau cukup tempelkan ID 11 karakter
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://youtu.be/... atau https://youtube.com/watch?v=..."
                      value={youtubeInput}
                      onChange={(e) => setYoutubeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCheckYoutube()}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                    <button
                      onClick={handleCheckYoutube}
                      disabled={isLoadingMeta || !youtubeInput.trim()}
                      className="bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      {isLoadingMeta ? 'Memeriksa...' : 'Cek Video'}
                    </button>
                  </div>

                  {errorMessage && (
                    <p className="text-xs text-rose-400 mt-2 font-medium">{errorMessage}</p>
                  )}
                </div>

                {/* Preview Card if resolved */}
                {previewSong && (
                  <div className="bg-slate-950 border border-pink-500/40 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                    <img
                      src={previewSong.thumbnail}
                      alt={previewSong.title}
                      className="w-24 h-16 rounded-lg object-cover border border-slate-800"
                    />
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <p className="text-xs font-bold text-white truncate">{previewSong.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{previewSong.channelTitle}</p>
                      <a
                        href={`https://www.youtube.com/watch?v=${previewSong.videoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-pink-400 inline-flex items-center gap-1 mt-1 hover:underline"
                      >
                        Buka di YouTube <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <button
                      onClick={handleAddCustomSong}
                      className="w-full sm:w-auto bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow transition-all"
                    >
                      Tambahkan ke Antrean
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={onCloseAddModal}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
