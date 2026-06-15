declare const chrome: {
  runtime: {
    onMessage: {
      addListener: (callback: (request: any, sender: any, sendResponse: (response?: any) => void) => void) => void;
    };
    sendMessage: (message: any, callback?: (response: any) => void) => void;
  };
  storage: {
    sync: {
      get: (keys: string | string[] | null, callback?: (result: any) => void) => void;
      set: (items: { [key: string]: any }, callback?: () => void) => void;
    };
  };
  tabs: {
    query: (queryInfo: { active: boolean; currentWindow: boolean }, callback?: (tabs: any[]) => void) => void;
  };
};

export {};
