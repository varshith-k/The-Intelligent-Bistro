import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  options?: { size?: string[] };
};

type CartItem = {
  itemId: string;
  quantity: number;
  size: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const fallbackMenu: MenuItem[] = [
  {
    id: 'spicy-chicken-sandwich',
    name: 'Spicy Chicken Sandwich',
    description: 'Crispy chicken, chili aioli, pickles',
    price: 8.5,
    options: { size: ['regular', 'large'] },
  },
  {
    id: 'veggie-wrap',
    name: 'Garden Veggie Wrap',
    description: 'Roasted veggies, hummus, herbs',
    price: 7.25,
    options: { size: ['regular', 'large'] },
  },
  {
    id: 'truffle-fries',
    name: 'Truffle Fries',
    description: 'Crisp fries, truffle oil, parmesan',
    price: 4.75,
    options: { size: ['regular', 'large'] },
  },
  {
    id: 'water',
    name: 'Water',
    description: 'Still water bottle',
    price: 2,
    options: { size: ['small', 'large'] },
  },
];

export default function App() {
  const [menu, setMenu] = useState<MenuItem[]>(fallbackMenu);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState('');
  const [assistantReply, setAssistantReply] = useState('Try: Add two spicy chicken sandwiches and a large water.');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/menu`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.menu) && data.menu.length > 0) {
          setMenu(data.menu);
        }
      })
      .catch(() => undefined);
  }, []);

  const priceById = useMemo(() => new Map(menu.map((item) => [item.id, item.price])), [menu]);
  const nameById = useMemo(() => new Map(menu.map((item) => [item.id, item.name])), [menu]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + (priceById.get(item.itemId) || 0) * item.quantity, 0),
    [cart, priceById],
  );

  const runAssistant = async (rawMessage: string) => {
    if (!rawMessage.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: rawMessage, cart }),
      });
      const data = await res.json();
      setAssistantReply(data.reply || 'Done.');
      if (Array.isArray(data.cart)) {
        setCart(data.cart);
      }
      setMessage('');
    } catch {
      Alert.alert('Backend unavailable', 'Make sure the Node backend is running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  const addFromUI = (item: MenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((entry) => entry.itemId === item.id && entry.size === 'regular');
      if (idx === -1) return [...prev, { itemId: item.id, quantity: 1, size: 'regular' }];
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      return next;
    });
  };

  const updateQuantity = (itemId: string, size: string, delta: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((entry) => entry.itemId === itemId && entry.size === size);
      if (idx === -1) return prev;
      const next = [...prev];
      const quantity = next[idx].quantity + delta;
      if (quantity <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], quantity };
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>The Intelligent Bistro</Text>
        <Text style={styles.subtitle}>Premium bites, managed by your AI ordering concierge.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu</Text>
          {menu.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.price}>${item.price.toFixed(2)}</Text>
              </View>
              <Text style={styles.cardDescription}>{item.description}</Text>
              <Pressable style={styles.button} onPress={() => addFromUI(item)}>
                <Text style={styles.buttonText}>Add to cart</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cart</Text>
          {cart.length === 0 ? (
            <Text style={styles.empty}>Your cart is empty.</Text>
          ) : (
            cart.map((item) => (
              <View key={`${item.itemId}-${item.size}`} style={styles.cartRow}>
                <View>
                  <Text style={styles.cartName}>{nameById.get(item.itemId) ?? item.itemId}</Text>
                  <Text style={styles.cartMeta}>{item.size}</Text>
                </View>
                <View style={styles.qtyControls}>
                  <Pressable style={styles.qtyButton} onPress={() => updateQuantity(item.itemId, item.size, -1)}>
                    <Text style={styles.qtySymbol}>−</Text>
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable style={styles.qtyButton} onPress={() => updateQuantity(item.itemId, item.size, 1)}>
                    <Text style={styles.qtySymbol}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
          <Text style={styles.total}>Total: ${total.toFixed(2)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Assistant</Text>
          <Text style={styles.reply}>{assistantReply}</Text>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Type your request..."
            placeholderTextColor="#9ca3af"
          />
          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={() => runAssistant(message)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send to assistant</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  screen: { flex: 1, backgroundColor: '#09090b' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#d4d4d8', fontSize: 15, marginTop: 4 },
  section: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 14,
    borderColor: '#27272a',
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  card: {
    backgroundColor: '#27272a',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardDescription: { color: '#d4d4d8' },
  price: { color: '#22d3ee', fontWeight: '700' },
  button: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  empty: { color: '#a1a1aa' },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartName: { color: '#fff', fontWeight: '600' },
  cartMeta: { color: '#a1a1aa', fontSize: 12 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySymbol: { color: '#fff', fontSize: 16, fontWeight: '700' },
  qtyText: { color: '#fff', minWidth: 16, textAlign: 'center' },
  total: { color: '#fff', fontSize: 18, fontWeight: '700' },
  reply: { color: '#e4e4e7', backgroundColor: '#27272a', borderRadius: 12, padding: 10 },
  input: {
    backgroundColor: '#27272a',
    borderColor: '#3f3f46',
    borderWidth: 1,
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
