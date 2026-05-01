import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Biometric unlock — Face ID / Touch ID / fingerprint gate on the Trips
 * wallet. Disabled by default; user enables it explicitly via the toggle
 * inside the My Trips modal.
 *
 * Source of truth for the on/off preference: expo-secure-store under the
 * BIOMETRIC_ENABLED_KEY. SecureStore is encrypted at rest on both platforms,
 * which matters because the value gates access to the booking history.
 */

const BIOMETRIC_ENABLED_KEY = 'jma_biometric_enabled';

export type BiometricCapability = {
  available: boolean;        // device has hardware AND is enrolled
  hasFaceId: boolean;
  hasTouchId: boolean;
  hasFingerprint: boolean;
};

export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return {
      available: hasHardware && isEnrolled,
      hasFaceId: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      hasTouchId: types.includes(LocalAuthentication.AuthenticationType.IRIS),
      hasFingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
    };
  } catch {
    return { available: false, hasFaceId: false, hasTouchId: false, hasFingerprint: false };
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, '1');
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    }
  } catch {
    // Non-fatal — preference will simply default to disabled next launch.
  }
}

/**
 * Prompt the user. Returns true if they authenticated successfully, false
 * for any failure / cancellation. The caller decides what to do on false
 * (typically: close the modal silently).
 */
export async function authenticate(reason: string): Promise<boolean> {
  try {
    const cap = await getBiometricCapability();
    if (!cap.available) return true; // device can't biometric → don't gate
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // allow PIN/passcode if biometric fails 3x
    });
    return result.success;
  } catch {
    return false;
  }
}
