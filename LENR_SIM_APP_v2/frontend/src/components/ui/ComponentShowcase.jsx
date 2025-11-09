import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Toggle, Badge } from './index';

const ComponentShowcase = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  
  // Toggle dark mode class on body
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  return (
    <div className={`p-8 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <Toggle 
            checked={isDarkMode} 
            onChange={() => setIsDarkMode(!isDarkMode)}
            label="Dark Mode"
          />
        </div>
        
        <Card 
          title="Component Library" 
          subtitle="A showcase of our Tailwind UI components with dark mode support"
          className="mb-8"
        >
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This showcase displays our custom UI components built with Tailwind CSS.
            All components support both light and dark mode.
          </p>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card title="Buttons" variant="elevated" className="mb-8">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>
          </Card>
          
          <Card title="Inputs" variant="elevated" className="mb-8">
            <div className="space-y-4">
              <Input 
                label="Default Input" 
                placeholder="Enter text here" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              
              <Input 
                label="Required Input" 
                placeholder="Required field" 
                required
              />
              
              <Input 
                label="With Error" 
                placeholder="Error state" 
                error={inputError || "This field has an error"}
              />
              
              <Input 
                label="With Helper" 
                placeholder="With helper text" 
                helper="This is helper text"
              />
              
              <Input 
                label="Disabled Input" 
                placeholder="Disabled" 
                disabled
              />
              
              <div className="flex gap-4">
                <Input 
                  label="With Prefix" 
                  placeholder="0.00" 
                  prefix="$"
                />
                
                <Input 
                  label="With Suffix" 
                  placeholder="Username" 
                  suffix="@example.com"
                />
              </div>
            </div>
          </Card>
          
          <Card title="Badges" variant="elevated" className="mb-8">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary" size="sm">Small</Badge>
                <Badge variant="primary">Medium</Badge>
                <Badge variant="primary" size="lg">Large</Badge>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary" rounded>Rounded</Badge>
                <Badge variant="secondary" rounded>Rounded</Badge>
                <Badge variant="outline" rounded>Rounded</Badge>
              </div>
            </div>
          </Card>
          
          <Card title="Toggle Switches" variant="elevated" className="mb-8">
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <Toggle label="Default Toggle" />
                <Toggle label="Checked Toggle" checked />
                <Toggle label="Disabled Toggle" disabled />
                <Toggle label="Disabled Checked" checked disabled />
              </div>
              
              <div className="flex gap-4 items-center">
                <Toggle size="sm" label="Small" />
                <Toggle size="md" label="Medium" />
                <Toggle size="lg" label="Large" />
              </div>
            </div>
          </Card>
          
          <Card title="Card Variants" variant="elevated" className="mb-8">
            <div className="space-y-4">
              <Card variant="default" title="Default Card" className="mb-2">
                Default card content
              </Card>
              
              <Card variant="elevated" title="Elevated Card" className="mb-2">
                Elevated card with shadow
              </Card>
              
              <Card variant="outline" bordered title="Outline Card" className="mb-2">
                Outline card with border
              </Card>
              
              <Card variant="flat" title="Flat Card" className="mb-2">
                Flat card with background
              </Card>
              
              <Card 
                title="Card with Footer" 
                variant="default"
                footer={<div className="flex justify-end">
                  <Button variant="primary" size="sm">Save</Button>
                </div>}
              >
                Card with footer content
              </Card>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComponentShowcase; 