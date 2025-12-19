import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isWeb } from "@/lib/platform";

export const useHaptics = () => {
  const impact = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (!isWeb()) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.log("Haptics not available");
      }
    }
  };

  const notification = async (type: NotificationType = NotificationType.Success) => {
    if (!isWeb()) {
      try {
        await Haptics.notification({ type });
      } catch (error) {
        console.log("Haptics not available");
      }
    }
  };

  const selectionChanged = async () => {
    if (!isWeb()) {
      try {
        await Haptics.selectionChanged();
      } catch (error) {
        console.log("Haptics not available");
      }
    }
  };

  const vibrate = async (duration: number = 100) => {
    if (!isWeb()) {
      try {
        await Haptics.vibrate({ duration });
      } catch (error) {
        console.log("Haptics not available");
      }
    }
  };

  return {
    impact,
    notification,
    selectionChanged,
    vibrate,
    ImpactStyle,
    NotificationType,
  };
};

// Standalone functions for use outside of React components
export const hapticImpact = async (style: ImpactStyle = ImpactStyle.Light) => {
  if (!isWeb()) {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.log("Haptics not available");
    }
  }
};

export const hapticNotification = async (type: NotificationType = NotificationType.Success) => {
  if (!isWeb()) {
    try {
      await Haptics.notification({ type });
    } catch (error) {
      console.log("Haptics not available");
    }
  }
};

export const hapticSelection = async () => {
  if (!isWeb()) {
    try {
      await Haptics.selectionChanged();
    } catch (error) {
      console.log("Haptics not available");
    }
  }
};
