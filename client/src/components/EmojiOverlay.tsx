import React, { useEffect, useState } from 'react';
import { ReactionDTO } from '../types';

interface EmojiOverlayProps {
  latestReaction: ReactionDTO | null;
}

interface ActiveReaction {
  id: string;
  emoji: string;
  right: number;
}

export const EmojiOverlay: React.FC<EmojiOverlayProps> = ({ latestReaction }) => {
  const [reactions, setReactions] = useState<ActiveReaction[]>([]);

  useEffect(() => {
    if (!latestReaction) return;

    const newReaction: ActiveReaction = {
      id: `${latestReaction.id}_${Math.random()}`,
      emoji: latestReaction.emoji,
      right: Math.floor(Math.random() * 80) + 10 // Random horizontal position offset (10% to 90%)
    };

    setReactions((prev) => [...prev.slice(-15), newReaction]); // Keep max 15 active particles

    const timer = setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2000);

    return () => clearTimeout(timer);
  }, [latestReaction]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 40 }}>
      {reactions.map((r) => (
        <div
          key={r.id}
          className="reaction-burst"
          style={{ right: `${r.right}%` }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
};
