import { motion } from 'framer-motion';
import { Trophy, TrendingUp, DollarSign, Crown, Medal, Award, Users, Activity } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useAuthStore } from '@/store/authStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';

interface RankEntry {
  userId: string;
  username: string;
  value: number;
  isReal: boolean;
}

export default function RankingsPage() {
  const { getTopWagered, getTopProfit, getTotalWagered } = useGameStore();
  const { user } = useAuthStore();
  const [wageredData, setWageredData] = useState<RankEntry[]>([]);
  const [profitData, setProfitData] = useState<RankEntry[]>([]);
  const [totalWagered, setTotalWagered] = useState(0);

  // Refresh data periodically to simulate live updates
  useEffect(() => {
    const updateData = () => {
      const topWagered = getTopWagered(50);
      const topProfit = getTopProfit(50);
      
      // Filter out admin users from leaderboard
      const filterAdmin = (entries: any[]) => {
        return entries.filter(e => e.username !== 'admin' && !e.userId?.includes('admin'));
      };
      
      setWageredData(filterAdmin(topWagered).map(w => ({ 
        userId: w.userId, 
        username: w.username, 
        value: w.total,
        isReal: w.isReal 
      })));
      
      setProfitData(filterAdmin(topProfit).map(p => ({ 
        userId: p.userId, 
        username: p.username, 
        value: p.profit,
        isReal: p.isReal 
      })));
      
      setTotalWagered(getTotalWagered());
    };

    updateData();
    const interval = setInterval(updateData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [getTopWagered, getTopProfit, getTotalWagered]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-300" />;
      case 3: return <Award className="w-5 h-5 text-orange-400" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-gray-500 font-bold text-sm">{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-500/20 via-yellow-500/10 to-transparent border-yellow-500/30';
      case 2: return 'bg-gradient-to-r from-gray-300/20 via-gray-300/10 to-transparent border-gray-300/30';
      case 3: return 'bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent border-orange-500/30';
      default: return 'bg-dark-700/30 border-white/5 hover:bg-dark-700/50';
    }
  };

  const getAvatarColor = (username: string) => {
    const colors = [
      'from-neon-green to-emerald-500',
      'from-neon-purple to-violet-500',
      'from-blue-500 to-cyan-500',
      'from-orange-500 to-red-500',
      'from-pink-500 to-rose-500',
      'from-indigo-500 to-purple-500',
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const isCurrentUser = (entry: RankEntry) => {
    return user && entry.userId === user.id;
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Leaderboard</h1>
          </div>
          <p className="text-gray-400">Top 50 players ranked by wagered amount and profit</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8"
        >
          <div className="p-4 rounded-2xl bg-dark-800 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-neon-green" />
              <span className="text-xs text-gray-400">Total Wagered</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">${totalWagered.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-800 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-neon-purple" />
              <span className="text-xs text-gray-400">Players</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">50+</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-800 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-neon-blue" />
              <span className="text-xs text-gray-400">Active Now</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white">{Math.floor(Math.random() * 50 + 100)}</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark-800 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400">Top Player</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-white truncate">
              {wageredData[0]?.username || 'None'}
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="wagered" className="w-full">
            <TabsList className="grid grid-cols-2 bg-dark-800 p-1 rounded-xl mb-6">
              <TabsTrigger value="wagered" className="rounded-lg data-[state=active]:bg-neon-green data-[state=active]:text-dark-900 text-gray-400 font-medium transition-all">
                <TrendingUp className="w-4 h-4 mr-2" />
                Most Wagered
              </TabsTrigger>
              <TabsTrigger value="profit" className="rounded-lg data-[state=active]:bg-neon-green data-[state=active]:text-dark-900 text-gray-400 font-medium transition-all">
                <DollarSign className="w-4 h-4 mr-2" />
                Top Profit
              </TabsTrigger>
            </TabsList>

            {/* Wagered Leaderboard */}
            <TabsContent value="wagered">
              <div className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 p-3 sm:p-4 text-xs text-gray-500 border-b border-white/5 bg-dark-800/80">
                  <span className="col-span-2 sm:col-span-1">Rank</span>
                  <span className="col-span-6 sm:col-span-7">Player</span>
                  <span className="col-span-4 text-right">Wagered</span>
                </div>
                
                <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
                  {wageredData.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No bets yet. Be the first!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {wageredData.map((entry, index) => (
                        <motion.div
                          key={entry.userId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(index * 0.02, 1) }}
                          className={`
                            grid grid-cols-12 gap-2 items-center p-3 sm:p-4 
                            ${getRankStyle(index + 1)} 
                            ${isCurrentUser(entry) ? 'bg-neon-green/10 border-l-2 border-l-neon-green' : 'border-l-2 border-l-transparent'}
                            transition-all duration-200
                          `}
                        >
                          <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                            {getRankIcon(index + 1)}
                          </div>
                          <div className="col-span-6 sm:col-span-7 flex items-center gap-2 sm:gap-3">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${getAvatarColor(entry.username)} flex items-center justify-center text-xs sm:text-sm font-bold text-white flex-shrink-0`}>
                              {entry.username[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium text-sm sm:text-base truncate">{entry.username}</p>
                              <div className="flex items-center gap-1">
                                {isCurrentUser(entry) && (
                                  <span className="text-xs text-neon-green font-medium">You</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-4 text-right">
                            <p className="text-neon-green font-bold text-sm sm:text-base">${entry.value.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">wagered</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Profit Leaderboard */}
            <TabsContent value="profit">
              <div className="bg-dark-800 rounded-2xl border border-white/5 overflow-hidden">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 p-3 sm:p-4 text-xs text-gray-500 border-b border-white/5 bg-dark-800/80">
                  <span className="col-span-2 sm:col-span-1">Rank</span>
                  <span className="col-span-6 sm:col-span-7">Player</span>
                  <span className="col-span-4 text-right">Profit</span>
                </div>
                
                <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
                  {profitData.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No profits yet. Start playing!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {profitData.map((entry, index) => (
                        <motion.div
                          key={entry.userId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(index * 0.02, 1) }}
                          className={`
                            grid grid-cols-12 gap-2 items-center p-3 sm:p-4 
                            ${getRankStyle(index + 1)} 
                            ${isCurrentUser(entry) ? 'bg-neon-green/10 border-l-2 border-l-neon-green' : 'border-l-2 border-l-transparent'}
                            transition-all duration-200
                          `}
                        >
                          <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                            {getRankIcon(index + 1)}
                          </div>
                          <div className="col-span-6 sm:col-span-7 flex items-center gap-2 sm:gap-3">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br ${getAvatarColor(entry.username)} flex items-center justify-center text-xs sm:text-sm font-bold text-white flex-shrink-0`}>
                              {entry.username[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-medium text-sm sm:text-base truncate">{entry.username}</p>
                              <div className="flex items-center gap-1">
                                {isCurrentUser(entry) && (
                                  <span className="text-xs text-neon-green font-medium">You</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-4 text-right">
                            <p className={`font-bold text-sm sm:text-base ${entry.value >= 0 ? 'text-neon-green' : 'text-red-500'}`}>
                              {entry.value >= 0 ? '+' : ''}${entry.value.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">profit</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500"
        >
          <div className="flex items-center gap-1">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span>1st Place</span>
          </div>
          <div className="flex items-center gap-1">
            <Medal className="w-4 h-4 text-gray-300" />
            <span>2nd Place</span>
          </div>
          <div className="flex items-center gap-1">
            <Award className="w-4 h-4 text-orange-400" />
            <span>3rd Place</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-neon-green" />
            <span>You</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
