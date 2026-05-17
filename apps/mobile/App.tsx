import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  tags?: string[];
  options?: { size?: string[] };
};

type CartItem = {
  itemId: string;
  quantity: number;
  size: string;
};

type AssistantAction = {
  type: string;
  itemId?: string;
  quantity?: number;
  size?: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const fallbackMenu: MenuItem[] = [
  {
    id: 'spicy-chicken-sandwich',
    name: 'Spicy Chicken Sandwich',
    description: 'Crispy chicken, chili aioli, pickles',
    price: 8.5,
    tags: ['spicy', 'chicken', 'sandwich'],
    options: { size: ['regular', 'large'] },
  },
  {
    id: 'veggie-wrap',
    name: 'Garden Veggie Wrap',
    description: 'Roasted veggies, hummus, herbs',
    price: 7.25,
    tags: ['veggie', 'wrap', 'vegetarian'],
    options: { size: ['regular', 'large'] },
  },
  {
    id: 'truffle-fries',
    name: 'Truffle Fries',
    description: 'Crisp fries, truffle oil, parmesan',
    price: 4.75,
    tags: ['fries', 'side'],
    options: { size: ['regular', 'large'] },
  },
  {
    id: 'water',
    name: 'Water',
    description: 'Still water bottle',
    price: 2,
    tags: ['water', 'drink'],
    options: { size: ['small', 'large'] },
  },
  {
    id: 'cold-brew',
    name: 'Cold Brew',
    description: 'Slow-steeped coffee on ice',
    price: 3.5,
    tags: ['coffee', 'cold', 'brew', 'drink'],
    options: { size: ['small', 'large'] },
  },
];

const quickPrompts = [
  'Add two spicy chicken sandwiches and a large water',
  'Set truffle fries to 2',
  'Remove water',
  'Clear my cart',
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function App() {
  const [menu, setMenu] = useState<MenuItem[]>(fallbackMenu);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [lastActions, setLastActions] = useState<AssistantAction[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi, I can build your order from plain English. Try asking for multiple items in one sentence.',
    },
  ]);

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

  const menuById = useMemo(() => new Map(menu.map((item) => [item.id, item])), [menu]);

  const cartLines = useMemo(
    () =>
      cart.map((item) => {
        const menuItem = menuById.get(item.itemId);
        const price = menuItem?.price ?? 0;
        return {
          ...item,
          name: menuItem?.name ?? item.itemId,
          price,
          lineTotal: price * item.quantity,
        };
      }),
    [cart, menuById],
  );

  const subtotal = useMemo(() => cartLines.reduce((sum, item) => sum + item.lineTotal, 0), [cartLines]);
  const serviceFee = subtotal > 0 ? 1.25 : 0;
  const total = subtotal + serviceFee;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const appendChat = (entry: Omit<ChatMessage, 'id'>) => {
    setChat((prev) => [...prev, { ...entry, id: `${Date.now()}-${prev.length}` }]);
  };

  const runAssistant = async (rawMessage: string) => {
    const trimmed = rawMessage.trim();
    if (!trimmed || loading) return;

    appendChat({ role: 'user', text: trimmed });
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, cart }),
      });

      if (!res.ok) {
        throw new Error(`Assistant request failed with ${res.status}`);
      }

      const data = await res.json();
      const reply = data.reply || 'Done.';
      appendChat({ role: 'assistant', text: reply });
      setLastActions(Array.isArray(data.actions) ? data.actions : []);

      if (Array.isArray(data.cart)) {
        setCart(data.cart);
      }
    } catch {
      Alert.alert('Backend unavailable', 'Start the Node backend with `npm start` in apps/backend, then try again.');
      appendChat({ role: 'assistant', text: 'I could not reach the kitchen service. Please check the backend and resend.' });
    } finally {
      setLoading(false);
    }
  };

  const selectedSizeFor = (item: MenuItem) => selectedSizes[item.id] ?? item.options?.size?.[0] ?? 'regular';

  const addFromUI = (item: MenuItem) => {
    const size = selectedSizeFor(item);
    setCart((prev) => {
      const idx = prev.findIndex((entry) => entry.itemId === item.id && entry.size === size);
      if (idx === -1) return [...prev, { itemId: item.id, quantity: 1, size }];

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

  const clearCart = () => {
    setCart([]);
    setLastActions([{ type: 'clear_cart' }]);
    appendChat({ role: 'assistant', text: 'Cart cleared. Fresh start.' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroTopline}>
              <Text style={styles.brand}>The Intelligent Bistro</Text>
              <Text style={styles.pill}>{itemCount} items</Text>
            </View>
            <Text style={styles.title}>Order with the speed of a chat and the confidence of a cart.</Text>
            <Text style={styles.subtitle}>
              Browse the menu, tap favorites, or ask the assistant to add, remove, and modify items for you.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AI Concierge</Text>
              <Text style={styles.sectionMeta}>{lastActions.length} structured actions</Text>
            </View>

            <View style={styles.chatBox}>
              {chat.slice(-4).map((entry) => (
                <View key={entry.id} style={[styles.bubble, entry.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={[styles.bubbleText, entry.role === 'user' && styles.userBubbleText]}>{entry.text}</Text>
                </View>
              ))}
              {loading && (
                <View style={[styles.bubble, styles.assistantBubble]}>
                  <ActivityIndicator color="#0f766e" />
                </View>
              )}
            </View>

            <View style={styles.promptRail}>
              {quickPrompts.map((prompt) => (
                <Pressable key={prompt} style={styles.promptChip} onPress={() => runAssistant(prompt)}>
                  <Text style={styles.promptText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Tell the assistant what to order..."
                placeholderTextColor="#8a8f8d"
                returnKeyType="send"
                onSubmitEditing={() => runAssistant(message)}
              />
              <Pressable
                style={[styles.sendButton, loading && styles.disabled]}
                onPress={() => runAssistant(message)}
                disabled={loading}
              >
                <Text style={styles.sendText}>Send</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleLight}>Menu</Text>
            <Text style={styles.sectionMeta}>{menu.length} items</Text>
          </View>

          <View style={styles.menuGrid}>
            {menu.map((item) => {
              const sizes = item.options?.size || ['regular'];
              const selectedSize = selectedSizeFor(item);

              return (
                <View key={item.id} style={styles.menuCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.itemMark}>
                      <Text style={styles.itemMarkText}>{item.name.slice(0, 1)}</Text>
                    </View>
                    <Text style={styles.price}>{currency.format(item.price)}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>

                  <View style={styles.sizeRow}>
                    {sizes.map((size) => (
                      <Pressable
                        key={size}
                        style={[styles.sizeChip, selectedSize === size && styles.sizeChipActive]}
                        onPress={() => setSelectedSizes((prev) => ({ ...prev, [item.id]: size }))}
                      >
                        <Text style={[styles.sizeText, selectedSize === size && styles.sizeTextActive]}>{size}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable style={styles.addButton} onPress={() => addFromUI(item)}>
                    <Text style={styles.addButtonText}>Add</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.panel}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cart</Text>
              <Pressable onPress={clearCart} disabled={cart.length === 0}>
                <Text style={[styles.clearText, cart.length === 0 && styles.mutedText]}>Clear</Text>
              </Pressable>
            </View>

            {cartLines.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyTitle}>No items yet</Text>
                <Text style={styles.emptyCopy}>Use the menu or ask the assistant to start building the order.</Text>
              </View>
            ) : (
              cartLines.map((item) => (
                <View key={`${item.itemId}-${item.size}`} style={styles.cartRow}>
                  <View style={styles.cartInfo}>
                    <Text style={styles.cartName}>{item.name}</Text>
                    <Text style={styles.cartMeta}>
                      {item.size} · {currency.format(item.lineTotal)}
                    </Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <Pressable style={styles.qtyButton} onPress={() => updateQuantity(item.itemId, item.size, -1)}>
                      <Text style={styles.qtySymbol}>-</Text>
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable style={styles.qtyButton} onPress={() => updateQuantity(item.itemId, item.size, 1)}>
                      <Text style={styles.qtySymbol}>+</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}

            <View style={styles.totalBox}>
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{currency.format(subtotal)}</Text>
              </View>
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>Service</Text>
                <Text style={styles.totalValue}>{currency.format(serviceFee)}</Text>
              </View>
              <View style={styles.grandTotalLine}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{currency.format(total)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07110f' },
  screen: { flex: 1, backgroundColor: '#07110f' },
  content: { padding: 18, gap: 18, paddingBottom: 42 },
  hero: {
    backgroundColor: '#102a25',
    borderRadius: 28,
    padding: 22,
    borderColor: '#244a42',
    borderWidth: 1,
    gap: 12,
  },
  heroTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  brand: { color: '#b9f4df', fontSize: 13, fontWeight: '800', letterSpacing: 0, textTransform: 'uppercase' },
  pill: {
    color: '#052e2b',
    backgroundColor: '#b9f4df',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontWeight: '800',
    fontSize: 12,
  },
  title: { color: '#fffaf1', fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: 0 },
  subtitle: { color: '#d7e7df', fontSize: 15, lineHeight: 22 },
  panel: {
    backgroundColor: '#f7f1e6',
    borderRadius: 24,
    padding: 16,
    gap: 14,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { color: '#17221f', fontSize: 21, fontWeight: '900' },
  sectionTitleLight: { color: '#f8f3ea', fontSize: 21, fontWeight: '900' },
  sectionMeta: { color: '#92aaa0', fontSize: 12, fontWeight: '700' },
  chatBox: { gap: 8 },
  bubble: {
    maxWidth: '88%',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#ffffff' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#123f37' },
  bubbleText: { color: '#26332f', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  userBubbleText: { color: '#fffaf1' },
  promptRail: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  promptChip: {
    backgroundColor: '#e7ddd0',
    borderColor: '#d7cab9',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  promptText: { color: '#273c36', fontSize: 12, fontWeight: '800' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#fffaf1',
    borderColor: '#ded2c1',
    borderWidth: 1,
    borderRadius: 16,
    color: '#17221f',
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
  },
  sendButton: {
    minHeight: 48,
    minWidth: 72,
    borderRadius: 16,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  disabled: { opacity: 0.55 },
  sendText: { color: '#fff', fontWeight: '900' },
  menuGrid: { gap: 12 },
  menuCard: {
    backgroundColor: '#fffaf1',
    borderRadius: 22,
    padding: 16,
    gap: 10,
    borderColor: '#eadfce',
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemMark: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#123f37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMarkText: { color: '#b9f4df', fontWeight: '900', fontSize: 18 },
  price: { color: '#9f4f2f', fontWeight: '900', fontSize: 16 },
  cardTitle: { color: '#17221f', fontSize: 18, fontWeight: '900' },
  cardDescription: { color: '#5d6964', fontSize: 14, lineHeight: 20 },
  sizeRow: { flexDirection: 'row', gap: 8 },
  sizeChip: {
    borderRadius: 999,
    borderColor: '#d9cbb9',
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#fffaf1',
  },
  sizeChipActive: { backgroundColor: '#123f37', borderColor: '#123f37' },
  sizeText: { color: '#40514b', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  sizeTextActive: { color: '#fffaf1' },
  addButton: {
    backgroundColor: '#d76735',
    borderRadius: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#fffaf1', fontWeight: '900', fontSize: 15 },
  clearText: { color: '#b4532a', fontWeight: '900' },
  mutedText: { color: '#a8aaa4' },
  emptyCart: {
    borderColor: '#e3d7c6',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 16,
    gap: 4,
    backgroundColor: '#fffaf1',
  },
  emptyTitle: { color: '#17221f', fontSize: 16, fontWeight: '900' },
  emptyCopy: { color: '#69756f', lineHeight: 20 },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fffaf1',
    borderRadius: 18,
    padding: 12,
  },
  cartInfo: { flex: 1 },
  cartName: { color: '#17221f', fontSize: 15, fontWeight: '900' },
  cartMeta: { color: '#69756f', fontSize: 12, fontWeight: '700', marginTop: 3, textTransform: 'capitalize' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#123f37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtySymbol: { color: '#fffaf1', fontSize: 18, fontWeight: '900' },
  qtyText: { color: '#17221f', minWidth: 18, textAlign: 'center', fontWeight: '900' },
  totalBox: {
    backgroundColor: '#173b34',
    borderRadius: 20,
    padding: 14,
    gap: 9,
  },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#c9dcd4', fontWeight: '700' },
  totalValue: { color: '#fffaf1', fontWeight: '800' },
  grandTotalLine: {
    borderTopColor: '#2f5d52',
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: { color: '#fffaf1', fontSize: 18, fontWeight: '900' },
  grandTotalValue: { color: '#b9f4df', fontSize: 22, fontWeight: '900' },
});
