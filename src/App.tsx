import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import {
  configureFonts,
  Provider as ThemeProvider,
  DarkTheme,
  Theme,
} from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as immer from 'immer';
import {
  Welcome,
  AuthenticationSetup,
  Authentication,
  Home,
  Sorting,
  BarcodeScanner,
  Settings,
} from './screens';
import { GlobalStateProvider, InteractablesProvider } from './hooks';
import { doesVaultExist, deleteVault } from './vault';
import * as storage from './async-storage';
import * as secureStorage from './secure-storage';
import { configuration } from './constants';

immer.enableES5();

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: 'white',
    background: 'black',
  },
  fonts: configureFonts({
    default: {
      regular: {
        fontFamily: 'Inter-Regular',
        fontWeight: 'normal',
      },
      medium: {
        fontFamily: 'Inter-Medium',
        fontWeight: 'normal',
      },
      light: {
        fontFamily: 'Inter-Light',
        fontWeight: 'normal',
      },
      thin: {
        fontFamily: 'Inter-Thin',
        fontWeight: 'normal',
      },
    },
  }),
};

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [vaultExists, setVaultExists] = useState(false);
  const [initialSettings, setInitialSettings] = useState(null);
  const [isReady, setReady] = useState(false);

  const initialize = async () => {
    await SplashScreen.preventAutoHideAsync();
    await loadAssets();

    setReady(true);
    await SplashScreen.hideAsync();
  };

  const loadAssets = async () => {
    if (configuration.shouldReset) {
      await Promise.all([
        deleteVault(),
        secureStorage.removePassword(),
        storage.clear(),
      ]);
    }

    await Promise.all([
      checkVault(),
      loadSettings(),
      loadImages(),
      loadFonts(),
    ]);
  };

  const checkVault = async () => {
    const vaultExists = await doesVaultExist();
    setVaultExists(vaultExists);
  };

  const loadSettings = async () => {
    const areBiometricsEnrolled = await LocalAuthentication.isEnrolledAsync();

    /**
     * If biometrics are unenrolled after having enabled
     * biometric unlock in the app, the stored password
     * should be forgotten.
     */
    if (!areBiometricsEnrolled) {
      await secureStorage.removePassword();
    }

    const biometricUnlock = Boolean(await secureStorage.getPassword());
    const concealTokens = Boolean(await storage.getConcealTokens());

    const loadedSettings = {
      biometricUnlock,
      concealTokens,
    };

    setInitialSettings(loadedSettings);
  };

  const loadImages = async () => {
    await Asset.loadAsync([require('../assets/logo.png')]);
  };

  const loadFonts = async () => {
    await Font.loadAsync({
      'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
      'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
      'Inter-Light': require('../assets/fonts/Inter-Light.ttf'),
      'Inter-Thin': require('../assets/fonts/Inter-Thin.ttf'),
      'IBMPlexMono-Regular': require('../assets/fonts/IBMPlexMono-Regular.ttf'),
    });
  };

  useEffect(() => {
    initialize();
  }, []);

  if (isReady) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />

        <ThemeProvider theme={theme}>
          <InteractablesProvider>
            <GlobalStateProvider settings={initialSettings}>
              {(globalState) => (
                <NavigationContainer>
                  <Stack.Navigator
                    initialRouteName={
                      vaultExists ? 'Authentication' : 'Welcome'
                    }
                    screenOptions={{
                      headerStyle: {
                        backgroundColor: 'black',
                      },
                      headerTitleStyle: {
                        color: 'white',
                      },
                      headerBackTitleStyle: {
                        color: 'white',
                      },
                      headerTintColor: 'white',
                    }}
                  >
                    {globalState.vault ? (
                      <>
                        <Stack.Screen name="Home" component={Home} />
                        <Stack.Screen name="Sorting" component={Sorting} />
                        <Stack.Screen
                          name="BarcodeScanner"
                          component={BarcodeScanner}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen name="Settings" component={Settings} />
                      </>
                    ) : (
                      <>
                        <Stack.Screen
                          name="Welcome"
                          component={Welcome}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="AuthenticationSetup"
                          component={AuthenticationSetup}
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="Authentication"
                          component={Authentication}
                          options={{ headerShown: false }}
                        />
                      </>
                    )}
                  </Stack.Navigator>
                </NavigationContainer>
              )}
            </GlobalStateProvider>
          </InteractablesProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return null;
};

export default App;
