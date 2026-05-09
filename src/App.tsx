import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Dimensions,
  SafeAreaView, Animated,
} from 'react-native';

const { width } = Dimensions.get('window');
const EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🦄','🐝','🦋','🐢'];
const SIZES = [
  { name: '4×3', cols: 4, rows: 3, pairs: 6 },
  { name: '4×4', cols: 4, rows: 4, pairs: 8 },
  { name: '5×4', cols: 5, rows: 4, pairs: 10 },
  { name: '6×5', cols: 6, rows: 5, pairs: 15 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function generateCards(pairs: number): Card[] {
  const selected = shuffle(EMOJIS).slice(0, pairs);
  const doubled = [...selected, ...selected];
  return shuffle(doubled).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

function CardView({ card, onPress, size, disabled }: { card: Card; onPress: () => void; size: number; disabled: boolean }) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [showFront, setShowFront] = useState(false);

  useEffect(() => {
    const target = card.flipped || card.matched ? 1 : 0;
    Animated.timing(flipAnim, { toValue: target, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => setShowFront(target === 1), 150);
  }, [card.flipped, card.matched]);

  const scaleX = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 1] });

  return (
    <TouchableOpacity onPress={disabled ? undefined : onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.card, { width: size, height: size }, { transform: [{ perspective: 800 }, { scaleX }] }]}>
        {showFront ? (
          <View style={[styles.cardFront, card.matched && styles.cardMatched]}>
            <Text style={styles.emoji}>{card.emoji}</Text>
          </View>
        ) : (
          <View style={styles.cardBack}>
            <Text style={styles.cardBackText}>?</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function App() {
  const [sizeIdx, setSizeIdx] = useState(0);
  const s = SIZES[sizeIdx];
  const [cards, setCards] = useState<Card[]>(() => generateCards(s.pairs));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const lockRef = useRef(false);

  const gap = 6;
  const cardSize = Math.floor((width - 30 - (s.cols - 1) * gap) / s.cols);

  useEffect(() => {
    if (!started || won) return;
    const iv = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [started, won]);

  const handleCard = useCallback((id: number) => {
    if (lockRef.current || won) return;
    setCards(prev => {
      const card = prev.find(c => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      if (flipped.includes(id)) return prev;

      if (!started) setStarted(true);

      const newFlipped = [...flipped, id];
      const updated = prev.map(c => c.id === id ? { ...c, flipped: true } : c);

      if (newFlipped.length === 2) {
        lockRef.current = true;
        setMoves(m => m + 1);
        const [a, b] = newFlipped;
        const cardA = updated.find(c => c.id === a)!;
        const cardB = updated.find(c => c.id === b)!;

        if (cardA.emoji === cardB.emoji) {
          setTimeout(() => {
            setCards(p => p.map(c => c.id === a || c.id === b ? { ...c, matched: true } : c));
            setMatches(m => {
              const nm = m + 1;
              if (nm === s.pairs) setWon(true);
              return nm;
            });
            setFlipped([]);
            lockRef.current = false;
          }, 400);
        } else {
          setTimeout(() => {
            setCards(p => p.map(c => c.id === a || c.id === b ? { ...c, flipped: false } : c));
            setFlipped([]);
            lockRef.current = false;
          }, 800);
        }
      } else {
        setFlipped(newFlipped);
      }
      return updated;
    });
  }, [flipped, won, started, s.pairs]);

  const newGame = useCallback((idx: number) => {
    setSizeIdx(idx);
    setCards(generateCards(SIZES[idx].pairs));
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setWon(false);
    setTime(0);
    setStarted(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Memory Match</Text>

      <View style={styles.sizes}>
        {SIZES.map((sz, i) => (
          <TouchableOpacity key={i} style={[styles.sizeBtn, sizeIdx === i && styles.sizeActive]} onPress={() => newGame(i)}>
            <Text style={[styles.sizeText, sizeIdx === i && styles.sizeTextActive]}>{sz.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.stats}>
        <Text style={styles.stat}>Moves: {moves}</Text>
        <Text style={styles.stat}>Pairs: {matches}/{s.pairs}</Text>
        <Text style={styles.stat}>⏱ {time}s</Text>
      </View>

      <View style={[styles.board, { gap }]}>
        {cards.map(card => (
          <CardView key={card.id} card={card} onPress={() => handleCard(card.id)} size={cardSize} disabled={lockRef.current} />
        ))}
      </View>

      <TouchableOpacity style={styles.newBtn} onPress={() => newGame(sizeIdx)}>
        <Text style={styles.newBtnText}>New Game</Text>
      </TouchableOpacity>

      {won && (
        <View style={styles.overlay}>
          <Text style={styles.wonText}>🎉 You Win!</Text>
          <Text style={styles.wonStats}>{moves} moves in {time}s</Text>
          <TouchableOpacity style={styles.playBtn} onPress={() => newGame(sizeIdx)}>
            <Text style={styles.playBtnText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23', alignItems: 'center', paddingTop: 10 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#ffd700', marginBottom: 8 },
  sizes: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  sizeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#1a1a3e' },
  sizeActive: { backgroundColor: '#ffd700' },
  sizeText: { color: '#888', fontWeight: 'bold', fontSize: 13 },
  sizeTextActive: { color: '#000' },
  stats: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  stat: { color: '#ccc', fontSize: 15, fontWeight: '600' },
  board: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 10 },
  card: { },
  cardFront: { flex: 1, backgroundColor: '#2a2a5e', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#4a4a8e' },
  cardMatched: { backgroundColor: '#1a4a1a', borderColor: '#2d8a2d' },
  cardBack: { flex: 1, backgroundColor: '#3a1a5e', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#6a3a9e' },
  cardBackText: { fontSize: 24, color: '#9a5ade', fontWeight: 'bold' },
  emoji: { fontSize: 30 },
  newBtn: { marginTop: 12, backgroundColor: '#3a1a5e', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  newBtnText: { color: '#fff', fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  wonText: { fontSize: 40, fontWeight: 'bold', color: '#ffd700' },
  wonStats: { fontSize: 18, color: '#aaa', marginTop: 5 },
  playBtn: { marginTop: 15, backgroundColor: '#ffd700', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  playBtnText: { color: '#000', fontWeight: 'bold', fontSize: 18 },
});
