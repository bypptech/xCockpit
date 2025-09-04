import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMiniApp } from '@/providers/MiniAppProvider';
import { Share2, Trophy, Users, Star } from 'lucide-react';

interface SocialFeaturesProps {
  walletAddress: string | null;
  totalPayments?: number;
  totalAmount?: string;
  deviceInteractions?: number;
}

export function SocialFeatures({ 
  walletAddress, 
  totalPayments = 0, 
  totalAmount = "0", 
  deviceInteractions = 0 
}: SocialFeaturesProps) {
  const { user, isMiniApp, shareCast, viewProfile } = useMiniApp();
  const [isSharing, setIsSharing] = useState(false);

  const handleShareProgress = async () => {
    if (!walletAddress) return;

    setIsSharing(true);
    try {
      const text = `🎮 Just controlled IoT devices with crypto payments on xCockpit! 

💰 ${totalPayments} payments made
🎯 ${deviceInteractions} device interactions
⚡ Powered by Base + USDC

Try it yourself! 🚀`;

      await shareCast(text, [window.location.origin]);

    } catch (error) {
      console.error('Failed to share:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareAchievement = async (achievement: string) => {
    setIsSharing(true);
    try {
      const text = `🏆 Achievement unlocked: ${achievement}

🎮 Playing xCockpit - Web3 IoT Control Dashboard
💳 Making payments with USDC on Base
🤖 Controlling real devices with crypto

Join me! 🚀`;

      await shareCast(text, [window.location.origin]);

    } catch (error) {
      console.error('Failed to share achievement:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // Generate achievements based on usage
  const achievements = [];
  if (totalPayments >= 1) achievements.push("First Payment");
  if (totalPayments >= 5) achievements.push("Regular User");
  if (totalPayments >= 10) achievements.push("Power User");
  if (deviceInteractions >= 10) achievements.push("Device Master");
  if (parseFloat(totalAmount) >= 10) achievements.push("Big Spender");

  return (
    <Card className="w-full" data-testid="social-features">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Social Features
          {isMiniApp && <Badge variant="secondary">Mini App</Badge>}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User Profile Display */}
        {user && (
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
            {user.pfpUrl && (
              <img 
                src={user.pfpUrl} 
                alt={user.displayName} 
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => viewProfile(user.fid)}
              data-testid="button-view-profile"
            >
              View Profile
            </Button>
          </div>
        )}

        {/* User Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary">{totalPayments}</p>
            <p className="text-xs text-muted-foreground">Payments</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary">{Number(totalAmount || 0).toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">USDC Spent</p>
          </div>
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Achievements
            </h4>
            <div className="flex flex-wrap gap-2">
              {achievements.map((achievement) => (
                <Badge
                  key={achievement}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => handleShareAchievement(achievement)}
                  data-testid={`achievement-${achievement.toLowerCase().replace(' ', '-')}`}
                >
                  <Star className="h-3 w-3 mr-1" />
                  {achievement}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Share Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleShareProgress}
            disabled={isSharing || !walletAddress}
            className="w-full"
            variant="outline"
            data-testid="button-share-progress"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {isSharing ? 'Sharing...' : 'Share Progress'}
          </Button>

          {isMiniApp && (
            <p className="text-xs text-muted-foreground text-center">
              Your activity will appear in your social feed!
            </p>
          )}
        </div>

        {/* Leaderboard Teaser */}
        <div className="p-3 border border-dashed border-primary/50 rounded-lg text-center">
          <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium">Coming Soon</p>
          <p className="text-xs text-muted-foreground">
            Global leaderboard and challenges with friends
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SocialFeatures;