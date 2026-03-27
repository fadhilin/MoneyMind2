import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { v4 as uuidv4 } from 'uuid';
import type { TransactionType } from '../types/finance';

export interface QuickTemplate {
  id: string;
  name: string;
  amount: number;
  category: string;
  icon: string;
  type: TransactionType;
}

const STORAGE_KEY = 'quick_templates';

export function useQuickTemplates() {
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        setTemplates(JSON.parse(value));
      }
    } catch (error) {
      console.error('Failed to load quick templates', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const addTemplate = async (template: Omit<QuickTemplate, 'id'>) => {
    const newTemplate: QuickTemplate = {
      ...template,
      id: uuidv4(),
    };
    
    const newTemplates = [...templates, newTemplate];
    setTemplates(newTemplates);
    
    try {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(newTemplates)
      });
    } catch (error) {
      console.error('Failed to save template', error);
    }
    
    return newTemplate;
  };

  const removeTemplate = async (id: string) => {
    const newTemplates = templates.filter(t => t.id !== id);
    setTemplates(newTemplates);
    
    try {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(newTemplates)
      });
    } catch (error) {
      console.error('Failed to remove template', error);
    }
  };

  return {
    templates,
    addTemplate,
    removeTemplate,
    isLoaded
  };
}
