import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Easing,
  TextInput,
  ScrollView,
  FlatList,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

// ---------- Theme ----------
const lightTheme = {
  primary: '#F0F4F8',
  secondary: '#E0E6EF',
  card: '#FFFFFF',
  text: '#334E68',
  accent: '#2196F3',
};

const darkTheme = {
  primary: '#101826',
  secondary: '#1b2940',
  card: '#21324a',
  text: '#E0E6EF',
  accent: '#42A5F5',
};

// ---------- Kategorien & Farben ----------
const INCOME_CATEGORIES = [
  { label: 'GoFundMe', value: 'GoFundMe', color: '#22c55e', icon: 'heart' },
  { label: 'Allgemeine Spenden', value: 'Allgemeine Spenden', color: '#10b981', icon: 'gift' },
  { label: 'Familien-Spende (privat)', value: 'Familien-Spende (privat)', color: '#0ea5e9', icon: 'users' },
  { label: 'Sonstiges', value: 'Sonstiges', color: '#a78bfa', icon: 'more-horizontal' },
];

const EXPENSE_CATEGORIES = [
  { label: 'Bank-Überweisung', value: 'Bank-Überweisung', color: '#ef4444', icon: 'credit-card' },
  { label: 'Geld an ein Familienmitglied', value: 'Geld an ein Familienmitglied', color: '#f97316', icon: 'user' },
  { label: 'Bargeld', value: 'Bargeld', color: '#eab308', icon: 'dollar-sign' },
  { label: 'Sonstiges', value: 'Sonstiges', color: '#a78bfa', icon: 'more-horizontal' },
];

const categoryColor = (cat, isIncome) => {
  const pool = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return pool.find(c => c.value === cat)?.color || (isIncome ? '#16a34a' : '#ef4444');
};

const categoryIcon = (cat, isIncome) => {
  const pool = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return pool.find(c => c.value === cat)?.icon || 'circle';
};

// ---------- Kontext ----------
const DonationContext = createContext();

const DonationProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTransactions();
    loadTheme();
  }, []);

  const loadTransactions = async () => {
    try {
      const stored = await AsyncStorage.getItem('transactions');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTransactions(parsed.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (e) {
      console.error('Failed to load transactions', e);
    }
  };

  const saveTransactions = async (list) => {
    try {
      const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
      await AsyncStorage.setItem('transactions', JSON.stringify(sorted));
      setTransactions(sorted);
    } catch (e) {
      console.error('Failed to save transactions', e);
    }
  };

  const addTransaction = async (t) => {
    const withId = { ...t, id: Date.now(), isPinned: false };
    await saveTransactions([withId, ...transactions]);
  };

  const updateTransaction = async (id, updatedTransaction) => {
    const updated = transactions.map(t => t.id === id ? { ...updatedTransaction, id } : t);
    await saveTransactions(updated);
  };

  const deleteTransaction = async (id) => {
    const filtered = transactions.filter(t => t.id !== id);
    await saveTransactions(filtered);
  };

  const toggleTheme = async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    await AsyncStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const loadTheme = async () => {
    try {
      const theme = await AsyncStorage.getItem('theme');
      if (theme) setIsDarkMode(theme === 'dark');
    } catch (e) {
      console.error('Failed to load theme', e);
    }
  };

  const totalIncome = transactions.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <DonationContext.Provider
      value={{
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        totalIncome,
        totalExpense,
        balance,
        isDarkMode,
        toggleTheme,
      }}
    >
      {children}
    </DonationContext.Provider>
  );
};

// ---------- Helpers ----------
const eur = (n) =>
  '€' +
  (Number.isFinite(n) ? n : 0)
    .toFixed(2)
    .replace('.', ',');

// ---------- UI: Filter Component (Bubbles bleiben) ----------
const FilterBar = ({ selectedCategories, onCategoryToggle, isIncome, searchText, onSearchChange }) => {
  const { isDarkMode } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <View style={styles.filterContainer}>
      <TextInput
        style={[
          styles.searchInput,
          { backgroundColor: theme.card, borderColor: theme.secondary, color: theme.text }
        ]}
        placeholder="Suchen..."
        placeholderTextColor={isDarkMode ? '#9fb1c6' : '#7a8ca1'}
        value={searchText}
        onChangeText={onSearchChange}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScrollView}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            onPress={() => onCategoryToggle(cat.value)}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedCategories.includes(cat.value) ? cat.color : theme.card,
                borderColor: cat.color,
              },
            ]}
          >
            <Feather
              name={cat.icon}
              size={14}
              color={selectedCategories.includes(cat.value) ? 'white' : cat.color}
            />
            <Text
              style={[
                styles.filterChipText,
                { color: selectedCategories.includes(cat.value) ? 'white' : cat.color },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ---------- UI: Category Chip ----------
const CategoryChip = ({ category, isIncome, isSelected, onPress }) => {
  const { isDarkMode } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const color = categoryColor(category, isIncome);
  const icon = categoryIcon(category, isIncome);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.categoryChip,
        {
          backgroundColor: isSelected ? color : theme.card,
          borderColor: color,
          borderWidth: 2,
        },
      ]}
    >
      <Feather name={icon} size={14} color={isSelected ? 'white' : color} style={{ marginRight: 6 }} />
      <Text style={[styles.categoryChipText, { color: isSelected ? 'white' : color }]}>
        {category}
      </Text>
    </TouchableOpacity>
  );
};

// ---------- UI: Add Modal ----------
const AddModal = ({ visible, isIncome, onClose, onSave }) => {
  const { isDarkMode } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');

  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (visible) {
      setCategory(categories[0].value);
      setAmount('');
      setNote('');
      setDate(new Date());
    }
  }, [visible, isIncome]);

  const handleSave = () => {
    const val = parseFloat((amount || '').replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      Alert.alert('Fehler', 'Bitte gib einen gültigen Betrag > 0 ein.');
      return;
    }

    onSave({
      amount: val,
      category,
      isIncome,
      date: date.toISOString(),
      note: note.trim(),
    });
    onClose();
  };

  const onDateChange = (_, selected) => {
    setShowDate(false);
    if (selected) setDate(selected);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.primary }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
            {isIncome ? 'Neue Einnahme' : 'Neue Ausgabe'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Feather name="check" size={22} color={theme.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* Betrag */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Betrag (€)</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.secondary, color: theme.text, backgroundColor: theme.card },
              ]}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor={isDarkMode ? '#9fb1c6' : '#7a8ca1'}
            />
          </View>

          {/* Kategorie */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Kategorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {categories.map((cat) => (
                  <CategoryChip
                    key={cat.value}
                    category={cat.label}
                    isIncome={isIncome}
                    isSelected={category === cat.value}
                    onPress={() => setCategory(cat.value)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Datum */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Datum</Text>
            <TouchableOpacity
              onPress={() => setShowDate(true)}
              style={[
                styles.input,
                {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.card,
                  borderColor: theme.secondary,
                },
              ]}
            >
              <Text style={{ color: theme.text }}>{date.toLocaleDateString('de-DE')}</Text>
              <Feather name="calendar" size={20} color={theme.text} />
            </TouchableOpacity>
            {showDate && (
              <DateTimePicker
                value={date}
                mode="date"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Notiz */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Notiz (optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  height: 90,
                  borderColor: theme.secondary,
                  color: theme.text,
                  backgroundColor: theme.card,
                  textAlignVertical: 'top',
                },
              ]}
              multiline
              value={note}
              onChangeText={setNote}
              placeholder="z. B. Anlass, Empfänger, Zweck…"
              placeholderTextColor={isDarkMode ? '#9fb1c6' : '#7a8ca1'}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ---------- UI: Edit Modal ----------
const EditModal = ({ visible, transaction, onClose, onSave }) => {
  const { isDarkMode } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString().replace('.', ','));
      setDate(new Date(transaction.date));
      setNote(transaction.note || '');
      setCategory(transaction.category);
    }
  }, [transaction]);

  const handleSave = () => {
    const val = parseFloat((amount || '').replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      Alert.alert('Fehler', 'Bitte gib einen gültigen Betrag > 0 ein.');
      return;
    }

    onSave({
      ...transaction,
      amount: val,
      category,
      date: date.toISOString(),
      note: note.trim(),
    });
    onClose();
  };

  const onDateChange = (_, selected) => {
    setShowDate(false);
    if (selected) setDate(selected);
  };

  if (!transaction) return null;

  const categories = transaction.isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.primary }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
            Eintrag bearbeiten
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Feather name="check" size={22} color={theme.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* Betrag */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Betrag (€)</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: theme.secondary, color: theme.text, backgroundColor: theme.card },
              ]}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor={isDarkMode ? '#9fb1c6' : '#7a8ca1'}
            />
          </View>

          {/* Kategorie */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Kategorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {categories.map((cat) => (
                  <CategoryChip
                    key={cat.value}
                    category={cat.label}
                    isIncome={transaction.isIncome}
                    isSelected={category === cat.value}
                    onPress={() => setCategory(cat.value)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Datum */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Datum</Text>
            <TouchableOpacity
              onPress={() => setShowDate(true)}
              style={[
                styles.input,
                {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.card,
                  borderColor: theme.secondary,
                },
              ]}
            >
              <Text style={{ color: theme.text }}>{date.toLocaleDateString('de-DE')}</Text>
              <Feather name="calendar" size={20} color={theme.text} />
            </TouchableOpacity>
            {showDate && (
              <DateTimePicker
                value={date}
                mode="date"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Notiz */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Notiz (optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  height: 90,
                  borderColor: theme.secondary,
                  color: theme.text,
                  backgroundColor: theme.card,
                  textAlignVertical: 'top',
                },
              ]}
              multiline
              value={note}
              onChangeText={setNote}
              placeholder="z. B. Anlass, Empfänger, Zweck…"
              placeholderTextColor={isDarkMode ? '#9fb1c6' : '#7a8ca1'}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ---------- App ----------
const Tab = createBottomTabNavigator();

const App = () => {
  return (
    <DonationProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </DonationProvider>
  );
};

const AppContent = () => {
  const { isDarkMode, toggleTheme } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.primary }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: theme.primary, elevation: 0, shadowOpacity: 0 },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: 'bold' },
          tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.secondary },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.text,
          headerRight: () => (
            <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
              <Feather name={isDarkMode ? 'sun' : 'moon'} size={20} color={theme.text} />
            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, size }) => {
            let icon = 'home';
            if (route.name === 'Home') icon = 'home';
            if (route.name === 'Einnahmen') icon = 'trending-up';
            if (route.name === 'Ausgaben') icon = 'trending-down';
            return <Feather name={icon} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Einnahmen" component={IncomeScreen} />
        <Tab.Screen name="Ausgaben" component={ExpenseScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

// ---------- UI: Compact StatsBox ----------
const CompactStatsBox = ({ label, value, gradientColors, icon, customIcon }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = animatedValue.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 700,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      animatedValue.removeListener(id);
    });
    return () => animatedValue.removeListener(id);
  }, [value]);

  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.compactStatsBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={styles.compactStatsLabel}>{label}</Text>
          <Text style={styles.compactStatsValue}>{eur(display)}</Text>
        </View>
        {customIcon ? customIcon : <Feather name={icon} size={18} color="rgba(255,255,255,0.85)" />}
      </View>
    </LinearGradient>
  );
};

// ---------- UI: Transaction Item ----------
const TransactionItem = ({ t, onEdit, onDelete }) => {
  const { isDarkMode } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const sign = t.isIncome ? '+' : '-';
  const amountColor = t.isIncome ? categoryColor(t.category, t.isIncome) : '#ef4444'; // Ausgaben immer rot
  const dotColor = categoryColor(t.category, t.isIncome);
  const icon = categoryIcon(t.category, t.isIncome);
  const formattedDate = new Date(t.date).toLocaleDateString('de-DE');

  const handleDelete = () => {
    Alert.alert('Löschen bestätigen', 'Möchten Sie diesen Eintrag wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => onDelete(t.id) },
    ]);
  };

  return (
    <View style={[styles.txCard, { backgroundColor: theme.card }]}>
      <View style={[styles.colorDot, { backgroundColor: dotColor }]}>
        <Feather name={icon} size={8} color="white" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: theme.text }}>{t.category}</Text>
        <Text style={{ fontSize: 12, color: theme.text, opacity: 0.7 }}>
          {formattedDate}{t.note ? ` • ${t.note}` : ''}
        </Text>
      </View>
      <Text style={{ fontWeight: '700', fontSize: 15, color: amountColor, marginRight: 10 }}>
        {sign} {eur(t.amount)}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity onPress={() => onEdit(t)} style={{ padding: 4 }}>
          <Feather name="edit-2" size={16} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
          <Feather name="trash-2" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---------- UI: Compact Sticky Dashboard (kleiner, kompakter, mit €-Icon) ----------
const CompactStickyDashboard = () => {
  const { totalIncome, totalExpense, balance, isDarkMode } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.compactStickyDashboard, { backgroundColor: theme.primary }]}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <CompactStatsBox
            label="Einnahmen"
            value={totalIncome}
            gradientColors={['#22c55e', '#10b981']}
            icon="trending-up"
          />
        </View>
        <View style={{ flex: 1 }}>
          <CompactStatsBox
            label="Ausgaben"
            value={totalExpense}
            gradientColors={['#ef4444', '#f97316']}
            icon="trending-down"
          />
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <CompactStatsBox
          label="Saldo"
          value={balance}
          gradientColors={balance >= 0 ? ['#2563eb', '#0ea5e9'] : ['#ef4444', '#f97316']}
          customIcon={<MaterialIcons name="euro" size={18} color="rgba(255,255,255,0.9)" />}
        />
      </View>
    </View>
  );
};

// ---------- Screen: Home ----------
const HomeScreen = () => {
  const { transactions, isDarkMode, updateTransaction, deleteTransaction, addTransaction } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState(true); // true = income, false = expense

  const latest = transactions.slice(0, 8); // Mehr Einträge sichtbar

  const handleEdit = (transaction) => setEditingTransaction(transaction);

  const handleSaveEdit = (updatedTransaction) => {
    updateTransaction(updatedTransaction.id, updatedTransaction);
    setEditingTransaction(null);
  };

  const handleAddIncome = () => {
    setAddModalType(true);
    setShowAddModal(true);
  };
  const handleAddExpense = () => {
    setAddModalType(false);
    setShowAddModal(true);
  };
  const handleSaveAdd = (newTransaction) => {
    addTransaction(newTransaction);
    setShowAddModal(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.primary }}>
      <CompactStickyDashboard />

      <View style={{ flex: 1, padding: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <TouchableOpacity
            style={[styles.compactQuickBtn, { backgroundColor: theme.card, borderColor: theme.secondary }]}
            onPress={handleAddIncome}
          >
            <Feather name="plus-circle" size={16} color="#22c55e" />
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>Einnahme</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.compactQuickBtn, { backgroundColor: theme.card, borderColor: theme.secondary }]}
            onPress={handleAddExpense}
          >
            <Feather name="minus-circle" size={16} color="#ef4444" />
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>Ausgabe</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8, color: theme.text }}>
          Letzte Transaktionen
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {latest.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Feather name="inbox" size={44} color={theme.text} opacity={0.3} />
              <Text style={{ color: theme.text, marginTop: 10, opacity: 0.7 }}>Noch keine Einträge. Leg los! 💪</Text>
            </View>
          ) : (
            latest.map((t) => (
              <TransactionItem key={t.id} t={t} onEdit={handleEdit} onDelete={deleteTransaction} />
            ))
          )}
        </ScrollView>
      </View>

      <AddModal visible={showAddModal} isIncome={addModalType} onClose={() => setShowAddModal(false)} onSave={handleSaveAdd} />
      <EditModal visible={!!editingTransaction} transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleSaveEdit} />
    </View>
  );
};

// ---------- Screen: Income ----------
const IncomeScreen = () => {
  const { transactions, isDarkMode, updateTransaction, deleteTransaction, addTransaction } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchText, setSearchText] = useState('');

  const handleCategoryToggle = (category) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const filteredTransactions = transactions
    .filter((t) => t.isIncome)
    .filter((t) => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(t.category);
      const matchesSearch =
        searchText === '' ||
        t.category.toLowerCase().includes(searchText.toLowerCase()) ||
        (t.note && t.note.toLowerCase().includes(searchText.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

  const handleEdit = (transaction) => setEditingTransaction(transaction);
  const handleSaveEdit = (updatedTransaction) => {
    updateTransaction(updatedTransaction.id, updatedTransaction);
    setEditingTransaction(null);
  };
  const handleSaveAdd = (newTransaction) => {
    addTransaction(newTransaction);
    setShowAddModal(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.primary }}>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Einnahmen ({filteredTransactions.length})</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.addButton, { backgroundColor: '#22c55e' }]}>
            <Feather name="plus" size={18} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 4, fontSize: 13 }}>Hinzufügen</Text>
          </TouchableOpacity>
        </View>

        <FilterBar
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          isIncome={true}
          searchText={searchText}
          onSearchChange={setSearchText}
        />

        {filteredTransactions.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Feather name="trending-up" size={44} color="#22c55e" opacity={0.3} />
            <Text style={{ color: theme.text, marginTop: 10, opacity: 0.7 }}>
              {transactions.filter((t) => t.isIncome).length === 0 ? 'Noch keine Einnahmen vorhanden' : 'Keine Einträge entsprechen den Filtern'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <TransactionItem t={item} onEdit={handleEdit} onDelete={deleteTransaction} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <AddModal visible={showAddModal} isIncome={true} onClose={() => setShowAddModal(false)} onSave={handleSaveAdd} />
      <EditModal visible={!!editingTransaction} transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleSaveEdit} />
    </View>
  );
};

// ---------- Screen: Expense ----------
const ExpenseScreen = () => {
  const { transactions, isDarkMode, updateTransaction, deleteTransaction, addTransaction } = useContext(DonationContext);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchText, setSearchText] = useState('');

  const handleCategoryToggle = (category) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  const filteredTransactions = transactions
    .filter((t) => !t.isIncome)
    .filter((t) => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(t.category);
      const matchesSearch =
        searchText === '' ||
        t.category.toLowerCase().includes(searchText.toLowerCase()) ||
        (t.note && t.note.toLowerCase().includes(searchText.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

  const handleEdit = (transaction) => setEditingTransaction(transaction);
  const handleSaveEdit = (updatedTransaction) => {
    updateTransaction(updatedTransaction.id, updatedTransaction);
    setEditingTransaction(null);
  };
  const handleSaveAdd = (newTransaction) => {
    addTransaction(newTransaction);
    setShowAddModal(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.primary }}>
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Ausgaben ({filteredTransactions.length})</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.addButton, { backgroundColor: '#ef4444' }]}>
            <Feather name="plus" size={18} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 4, fontSize: 13 }}>Hinzufügen</Text>
          </TouchableOpacity>
        </View>

        <FilterBar
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          isIncome={false}
          searchText={searchText}
          onSearchChange={setSearchText}
        />

        {filteredTransactions.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Feather name="trending-down" size={44} color="#ef4444" opacity={0.3} />
            <Text style={{ color: theme.text, marginTop: 10, opacity: 0.7 }}>
              {transactions.filter((t) => !t.isIncome).length === 0 ? 'Noch keine Ausgaben vorhanden' : 'Keine Einträge entsprechen den Filtern'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <TransactionItem t={item} onEdit={handleEdit} onDelete={deleteTransaction} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <AddModal visible={showAddModal} isIncome={false} onClose={() => setShowAddModal(false)} onSave={handleSaveAdd} />
      <EditModal visible={!!editingTransaction} transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={handleSaveEdit} />
    </View>
  );
};

// ---------- Styles ----------
const styles = StyleSheet.create({
  // Compact sticky dashboard
  compactStickyDashboard: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  compactStatsBox: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  compactStatsLabel: { fontSize: 12, fontWeight: '600', color: 'white' },
  compactStatsValue: { fontSize: 20, fontWeight: '800', color: 'white', marginTop: 4 },

  // Transaction card (leicht kompakter)
  txCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filter bubbles
  filterContainer: { marginBottom: 10 },
  searchInput: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 8,
  },
  categoryScrollView: { marginBottom: 4 },
  categoryScrollContent: { paddingHorizontal: 2 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },

  // Category select chips (in Modals)
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    marginRight: 8,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600' },

  // Inputs
  inputContainer: { marginBottom: 12 },
  label: { marginBottom: 6, fontSize: 15, fontWeight: '600' },
  input: { padding: 12, borderRadius: 12, borderWidth: 1, fontSize: 15 },

  // Compact quick buttons
  compactQuickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  // Add top-right button in tabs
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
});

export default App;