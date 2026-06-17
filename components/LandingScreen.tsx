import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
  const { signInWithGoogle, loginWithCode } = useAuth();
  const [showCode, setShowCode]   = useState(false);
  const [code, setCode]           = useState('');
  const [codeError, setCodeError] = useState(false);
  const [loading, setLoading]     = useState(false);

  async function handleGoogle() {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  }

  function handleCode() {
    if (code.length !== 6) { setCodeError(true); return; }
    const ok = loginWithCode(code);
    if (!ok) {
      setCodeError(true);
      setCode('');
    }
  }

  return (
    <View style={s.root}>
      {/* Fondo degradado con círculos decorativos */}
      <View style={s.circle1} />
      <View style={s.circle2} />
      <View style={s.circle3} />

      <View style={s.content}>
        {/* Logo / icono */}
        <View style={s.logoWrap}>
          <Text style={s.logoIcon}>⚽</Text>
        </View>

        {/* Título */}
        <Text style={s.title}>WikiBet</Text>
        <Text style={s.tagline}>Análisis deportivo con IA</Text>

        {/* Separador */}
        <View style={s.divider} />

        {/* Features */}
        <View style={s.features}>
          {[
            { icon: '🤖', text: 'Pronósticos con Inteligencia Artificial' },
            { icon: '📊', text: 'Análisis completo de cada partido' },
            { icon: '💰', text: 'Value bets y mercados recomendados' },
            { icon: '🏆', text: 'Mundial 2026 en tiempo real' },
          ].map(f => (
            <View key={f.text} style={s.featureRow}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Botones de acceso */}
        {!showCode ? (
          <View style={s.btns}>
            {/* Google */}
            <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#111" />
                : <>
                    <Text style={s.googleG}>G</Text>
                    <Text style={s.googleText}>Continuar con Google</Text>
                  </>
              }
            </TouchableOpacity>

            {/* Código */}
            <TouchableOpacity style={s.codeBtn} onPress={() => setShowCode(true)} activeOpacity={0.8}>
              <Text style={s.codeBtnText}>🔑  Acceder con código</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.codeBox}>
            <Text style={s.codeTitle}>Introduce el código de acceso</Text>
            <TextInput
              style={[s.codeInput, codeError && s.codeInputError]}
              placeholder="● ● ● ● ● ●"
              placeholderTextColor="#4b5563"
              value={code}
              onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setCodeError(false); }}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textAlign="center"
              letterSpacing={10}
            />
            {codeError && <Text style={s.codeError}>Código incorrecto</Text>}
            <TouchableOpacity
              style={[s.googleBtn, code.length === 6 ? {} : { opacity: 0.5 }]}
              onPress={handleCode}
              disabled={code.length !== 6}
            >
              <Text style={s.googleText}>Acceder</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowCode(false); setCode(''); setCodeError(false); }}>
              <Text style={s.backText}>← Volver</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={s.legal}>
          Al continuar aceptas los términos de uso y la política de privacidad
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#060d1a',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },

  // Decoración de fondo
  circle1: {
    position: 'absolute', width: 400, height: 400, borderRadius: 200,
    backgroundColor: '#22c55e', opacity: 0.06,
    top: -100, right: -100,
  },
  circle2: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#22c55e', opacity: 0.04,
    bottom: 0, left: -80,
  },
  circle3: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#f59e0b', opacity: 0.05,
    top: '40%', left: '60%',
  },

  content: {
    width: '100%', maxWidth: 420,
    paddingHorizontal: 28, alignItems: 'center',
    zIndex: 1,
  },

  // Logo
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#22c55e18', borderWidth: 1, borderColor: '#22c55e40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  logoIcon: { fontSize: 40 },

  // Título
  title: {
    fontSize: 48, fontWeight: '900', color: '#ffffff',
    letterSpacing: -1, marginBottom: 6,
  },
  tagline: {
    fontSize: 16, color: '#9ca3af', fontWeight: '500',
    letterSpacing: 0.3, marginBottom: 28,
  },

  // Divider
  divider: {
    width: 40, height: 2, backgroundColor: '#22c55e',
    borderRadius: 2, marginBottom: 28,
  },

  // Features
  features: {
    alignSelf: 'stretch', marginBottom: 32, gap: 12,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ffffff08', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: '#ffffff0a',
  },
  featureIcon: { fontSize: 18 },
  featureText: { fontSize: 14, color: '#d1d5db', flex: 1, fontWeight: '500' },

  // Botones
  btns: { alignSelf: 'stretch', gap: 12, marginBottom: 20 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#ffffff', borderRadius: 14,
    paddingVertical: 15, alignSelf: 'stretch',
  },
  googleG: { fontSize: 17, fontWeight: '900', color: '#1a73e8' },
  googleText: { fontSize: 15, fontWeight: '700', color: '#111' },

  codeBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff0f', borderRadius: 14,
    paddingVertical: 14, alignSelf: 'stretch',
    borderWidth: 1, borderColor: '#ffffff18',
  },
  codeBtnText: { fontSize: 15, color: '#d1d5db', fontWeight: '600' },

  // Input código
  codeBox: { alignSelf: 'stretch', gap: 12, marginBottom: 20, alignItems: 'center' },
  codeTitle: { fontSize: 15, color: '#9ca3af', marginBottom: 4 },
  codeInput: {
    alignSelf: 'stretch', backgroundColor: '#111827',
    borderRadius: 14, borderWidth: 1, borderColor: '#374151',
    color: '#ffffff', fontSize: 28, fontWeight: '800',
    paddingVertical: 16, paddingHorizontal: 20,
  },
  codeInputError: { borderColor: '#ef4444' },
  codeError: { color: '#ef4444', fontSize: 13 },
  backText: { color: '#6b7280', fontSize: 14, marginTop: 4 },

  legal: {
    fontSize: 11, color: '#4b5563', textAlign: 'center', lineHeight: 16,
  },
});
