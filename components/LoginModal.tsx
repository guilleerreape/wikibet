import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TextInput, Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function LoginModal({ visible, onClose }: Props) {
  const { signInWithGoogle, loginWithCode } = useAuth();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  async function handleGoogle() {
    onClose();
    await signInWithGoogle();
  }

  function handleCode() {
    const ok = loginWithCode(code.trim());
    if (ok) {
      setCode('');
      setCodeError('');
      setShowCodeInput(false);
      onClose();
    } else {
      setCodeError('Código incorrecto. Inténtalo de nuevo.');
    }
  }

  function handleClose() {
    setCode('');
    setCodeError('');
    setShowCodeInput(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Header */}
          <Text style={s.emoji}>⚽</Text>
          <Text style={s.title}>WikiBet</Text>
          <Text style={s.subtitle}>Inicia sesión para analizar partidos y chatear con la IA</Text>

          {/* Beneficios */}
          <View style={s.benefits}>
            {[
              '🔍  3 análisis de IA a la semana (gratis)',
              '💬  5 mensajes de chat a la semana (gratis)',
              '🏆  Pronósticos WC 2026 en tiempo real',
              '⚡  Premium+ — uso ilimitado',
            ].map(b => (
              <Text key={b} style={s.benefit}>{b}</Text>
            ))}
          </View>

          {/* Google */}
          <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} activeOpacity={0.85}>
            <Text style={s.googleIcon}>G</Text>
            <Text style={s.googleText}>Continuar con Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>o</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Code access */}
          {!showCodeInput ? (
            <TouchableOpacity style={s.codeToggleBtn} onPress={() => setShowCodeInput(true)} activeOpacity={0.8}>
              <Text style={s.codeToggleText}>🔑  Tengo un código de acceso</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.codeSection}>
              <TextInput
                style={s.codeInput}
                placeholder="Introduce tu código"
                placeholderTextColor="#4b5563"
                value={code}
                onChangeText={t => { setCode(t); setCodeError(''); }}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleCode}
                returnKeyType="done"
              />
              {codeError ? <Text style={s.codeError}>{codeError}</Text> : null}
              <TouchableOpacity style={s.codeBtn} onPress={handleCode} activeOpacity={0.85}>
                <Text style={s.codeBtnText}>Acceder</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCodeInput(false); setCode(''); setCodeError(''); }}>
                <Text style={s.codeCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Close */}
          <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
            <Text style={s.closeText}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 380,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  emoji: { fontSize: 44, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: {
    fontSize: 14, color: '#9ca3af', textAlign: 'center',
    marginBottom: 20, lineHeight: 20,
  },
  benefits: {
    alignSelf: 'stretch', marginBottom: 24,
    backgroundColor: '#1f2937', borderRadius: 12, padding: 14, gap: 8,
  },
  benefit: { color: '#d1fae5', fontSize: 13, lineHeight: 20 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 24,
    alignSelf: 'stretch', justifyContent: 'center',
    marginBottom: 4,
  },
  googleIcon: { fontSize: 16, fontWeight: '800', color: '#1a73e8' },
  googleText: { fontSize: 15, fontWeight: '600', color: '#111' },

  divider: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'stretch', marginVertical: 14, gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1f2937' },
  dividerText: { color: '#4b5563', fontSize: 12 },

  codeToggleBtn: {
    alignSelf: 'stretch', borderRadius: 12,
    borderWidth: 1, borderColor: '#374151',
    paddingVertical: 13, alignItems: 'center',
    marginBottom: 4,
  },
  codeToggleText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },

  codeSection: {
    alignSelf: 'stretch', gap: 8, marginBottom: 4,
  },
  codeInput: {
    backgroundColor: '#1f2937',
    borderRadius: 12, borderWidth: 1, borderColor: '#374151',
    paddingVertical: 13, paddingHorizontal: 16,
    color: '#fff', fontSize: 16,
    textAlign: 'center', letterSpacing: 2,
  },
  codeError: {
    color: '#ef4444', fontSize: 12, textAlign: 'center',
  },
  codeBtn: {
    backgroundColor: '#22c55e', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  codeBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  codeCancelText: { color: '#4b5563', fontSize: 13, textAlign: 'center', paddingVertical: 4 },

  closeBtn: { paddingVertical: 10, marginTop: 4 },
  closeText: { color: '#6b7280', fontSize: 14 },
});
