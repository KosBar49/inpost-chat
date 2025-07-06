import { test, expect } from '@playwright/test';

// Utility function to scrape chat responses from iframe
async function scrapeChatResponses(chatFrame: any, page: any, sentMessage: string = '') {
  // Wait a bit for content to stabilize (use page.waitForTimeout instead of chatFrame)
  await page.waitForTimeout(2000);
  
  try {
    // Get a comprehensive view of the chat content
    console.log('🔍 Extracting chat content...');
    
    // Try multiple targeted selectors to get chat content
    const listItems = await chatFrame.locator('li').allTextContents();
    const paragraphs = await chatFrame.locator('p').allTextContents();
    
    // More targeted selectors for chat messages
    const messageContainers = await chatFrame.locator('[class*="message"], [class*="chat"], [class*="response"], [data-testid*="message"]').allTextContents();
    const textNodes = await chatFrame.locator('span:not([class*="timestamp"]):not([class*="time"])').allTextContents();
    
    // Generic selectors as fallback
    const spans = await chatFrame.locator('span').allTextContents();
    const divs = await chatFrame.locator('div').allTextContents();
    
    // Log what we found for debugging
    console.log(`   Found ${listItems.length} list items`);
    console.log(`   Found ${paragraphs.length} paragraphs`);
    console.log(`   Found ${messageContainers.length} message containers`);
    console.log(`   Found ${textNodes.length} text nodes`);
    console.log(`   Found ${spans.length} spans`);
    console.log(`   Found ${divs.length} divs`);
    
    // Combine all potential text sources (prioritize targeted selectors)
    const allTexts = [...listItems, ...paragraphs, ...messageContainers, ...textNodes, ...spans, ...divs];
    
    // Enhanced filtering to remove noise (timestamps, user messages, CSS, etc.)
    const cleanedResponses = allTexts.filter(text => {
      const cleanText = text.trim();
      
      // Basic length and emptiness checks
      if (cleanText.length === 0) return false;
      if (cleanText.length < 4) return false;
      
      // Filter timestamps - enhanced regex for various formats
      if (cleanText.match(/^\d{1,2}:\d{2}\s*(AM|PM)?$/i)) return false;
      if (cleanText.match(/\d{1,2}:\d{2}\s*(AM|PM)?\s*$/i)) return false;
      
      // Filter CSS content
      if (cleanText.includes('opacity') && cleanText.includes('transition')) return false;
      if (cleanText.includes('fade-enter') || cleanText.includes('fade-leave')) return false;
      if (cleanText.match(/^\s*\.\w+[-\w]*\s*\{/)) return false; // CSS class selectors
      if (cleanText.includes('{') && cleanText.includes('}') && cleanText.includes(':')) return false;
      
      // Filter user message
      if (cleanText.toLowerCase().includes(sentMessage.toLowerCase()) && sentMessage.length > 0) return false;
      
      // Filter UI elements and common interface text
      if (cleanText.match(/^(send|upload|emoji|settings|close|twoja wiadomość|inpost)$/i)) return false;
      
      // Filter pure whitespace or special characters
      if (cleanText.match(/^[\s\n\t\r]+$/)) return false;
      
      // Filter very technical content
      if (cleanText.includes('webkit-') || cleanText.includes('moz-') || cleanText.includes('ms-')) return false;
      
      return true;
    });
    
    // Remove duplicates and return
    const uniqueResponses = [...new Set(cleanedResponses)];
    console.log(`   Extracted ${uniqueResponses.length} unique responses`);
    
    // Enhanced debugging: log HTML structure and raw responses for analysis
    if (uniqueResponses.length === 0) {
      console.log('⚠️ No responses found - logging debug info...');
      
      try {
        // Get HTML structure of chat area
        const chatHTML = await chatFrame.locator('body').innerHTML();
        console.log('🔧 Chat HTML structure (first 1000 chars):');
        console.log(chatHTML.substring(0, 1000));
        
        // Log first 10 raw texts for analysis
        console.log('🔧 First 10 raw texts found:');
        allTexts.slice(0, 10).forEach((text, index) => {
          console.log(`   ${index + 1}: "${text.substring(0, 100)}"`);
        });
      } catch (debugError) {
        console.log('⚠️ Debug logging failed:', debugError.message);
      }
    }
    
    return uniqueResponses;
  } catch (error) {
    console.log('⚠️ Error scraping chat responses:', error.message);
    return [];
  }
}

// Utility function to scrape available action buttons
async function scrapeActionButtons(chatFrame: any, page: any) {
  try {
    console.log('🔘 Extracting action buttons...');
    
    // Wait a bit more for action buttons to appear (they might load after messages)
    await page.waitForTimeout(1000);
    
    // Try multiple strategies to find action buttons
    const allButtons = await chatFrame.locator('button').allTextContents();
    const buttonElements = await chatFrame.locator('button').all();
    
    console.log(`   Found ${allButtons.length} total buttons`);
    
    // Debug: Inspect button element structure
    if (buttonElements.length > 0) {
      console.log('🔧 DEBUG - Examining button elements structure...');
      
      for (let i = 0; i < Math.min(buttonElements.length, 4); i++) {
        const button = buttonElements[i];
        
        // Try different text content methods
        const textContent = await button.textContent();
        const innerText = await button.innerText();
        const innerHTML = await button.innerHTML();
        
        console.log(`   Button ${i + 1}:`);
        console.log(`     textContent: "${textContent || 'EMPTY'}"`);
        console.log(`     innerText: "${innerText || 'EMPTY'}"`);
        console.log(`     innerHTML: "${innerHTML ? innerHTML.substring(0, 100) : 'EMPTY'}"`);
        
        // Check if button has child elements with text
        const childElements = await button.locator('*').allTextContents();
        console.log(`     Child elements text: [${childElements.join(', ')}]`);
        
        // Check for aria-label or other attributes
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        const dataTestId = await button.getAttribute('data-testid');
        
        console.log(`     aria-label: "${ariaLabel || 'NONE'}"`);
        console.log(`     title: "${title || 'NONE'}"`);
        console.log(`     data-testid: "${dataTestId || 'NONE'}"`);
      }
    }
    
    // Also try looking for specific action button containers
    const actionButtonContainers = await chatFrame.locator('[class*="action"], [class*="quick"], [class*="button-group"], [data-testid*="action"]').allTextContents();
    const linkButtons = await chatFrame.locator('a[role="button"]').allTextContents();
    
    // Try looking for buttons with different text extraction methods
    const buttonTexts = [];
    for (const button of buttonElements) {
      const textContent = await button.textContent();
      const innerText = await button.innerText();
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');
      
      // Use the first non-empty text we find
      const buttonText = textContent || innerText || ariaLabel || title || '';
      buttonTexts.push(buttonText);
    }
    
    // Also check for clickable elements that might not be buttons (like divs with click handlers)
    const clickableElements = await chatFrame.locator('button, a, [role="button"], [onclick], [class*="button"], [class*="action"], [class*="quick"], [class*="option"]').allTextContents();
    const clickableWithText = clickableElements.filter(text => text.trim().length > 0);
    
    console.log(`   Found ${clickableWithText.length} clickable elements with text: [${clickableWithText.join(', ')}]`);
    
    // Combine all potential action button sources
    const allPotentialButtons = [...allButtons, ...buttonTexts, ...actionButtonContainers, ...linkButtons, ...clickableWithText];
    
    console.log(`   Found ${actionButtonContainers.length} action containers`);
    console.log(`   Found ${linkButtons.length} link buttons`);
    console.log(`   Alternative button texts: [${buttonTexts.join(', ')}]`);
    
    // Enhanced filtering for action buttons
    const actionButtons = allPotentialButtons.filter(text => {
      const cleanText = text.trim();
      
      // Must have reasonable length
      if (cleanText.length < 3 || cleanText.length > 50) return false;
      
      // Filter out common UI buttons
      if (cleanText.match(/^(send|upload|emoji|settings|close|twoja wiadomość|chat|inpost)$/i)) return false;
      
      // Filter out messages that are just timestamps or CSS
      if (cleanText.match(/^\d{1,2}:\d{2} (AM|PM)$/i)) return false;
      
      // Look for typical action button patterns
      const isActionButton = 
        cleanText.toLowerCase().includes('status') ||
        cleanText.toLowerCase().includes('package') ||
        cleanText.toLowerCase().includes('courier') ||
        cleanText.toLowerCase().includes('mobile') ||
        cleanText.toLowerCase().includes('app') ||
        cleanText.toLowerCase().includes('locker') ||
        cleanText.toLowerCase().includes('point') ||
        cleanText.toLowerCase().includes('find') ||
        cleanText.toLowerCase().includes('track') ||
        cleanText.toLowerCase().includes('help') ||
        cleanText.toLowerCase().includes('tracking') ||
        cleanText.toLowerCase().includes('number') ||
        cleanText.toLowerCase().includes('phone') ||
        cleanText.toLowerCase().includes('by ');
        
      return isActionButton || (cleanText.length > 5 && cleanText.length < 30);
    });
    
    // Remove duplicates
    const uniqueActionButtons = [...new Set(actionButtons)];
    
    console.log(`   Extracted ${uniqueActionButtons.length} action buttons`);
    
    // Debug: log all button texts for analysis
    if (allButtons.length > 0) {
      console.log('🔧 DEBUG - All button texts:', allButtons);
    }
    
    return uniqueActionButtons;
  } catch (error) {
    console.log('⚠️ Error scraping action buttons:', error.message);
    return [];
  }
}

test.describe('InPost Chat MAT Integration - MCP Server Refactored', () => {
  test('MCP Server - Main scenario with dynamic chat scraping', async ({ page }) => {
    console.log('🚀 Starting main MCP Server scenario with dynamic scraping...');
    
    // Navigate to InPost contact page
    console.log('📍 Navigating to https://inpost.pl/kontakt');
    await page.goto('https://inpost.pl/kontakt');
    
    // Handle cookies if present
    console.log('🍪 Handling cookies...');
    try {
      await page.getByRole('button', { name: 'ACCEPT' }).click({ timeout: 5000 });
      console.log('✅ Cookies accepted');
    } catch (error) {
      console.log('ℹ️ No cookies banner found');
    }
    
    // Click Zapytaj MATa button
    console.log('🤖 Clicking Zapytaj MATa button...');
    await page.getByRole('button', { name: 'Zapytaj MATa' }).click();
    await page.waitForTimeout(2000);
    
    // Open chat interface
    console.log('💬 Opening chat interface...');
    await page.getByRole('button', { name: 'Chat' }).click();
    
    // Get chat frame
    const chatFrame = page.locator('iframe[title="chatbot"]').contentFrame();
    await expect(chatFrame.getByRole('textbox', { name: 'Twoja wiadomość' })).toBeVisible();
    console.log('✅ Chat interface ready');
    
    // Send hello message
    const message = 'hello';
    console.log(`📝 Sending message: "${message}"`);
    await chatFrame.getByRole('textbox', { name: 'Twoja wiadomość' }).fill(message);
    await chatFrame.getByRole('button', { name: 'Send' }).click();
    console.log('✅ Message sent');
    
    // Wait for initial response
    await page.waitForTimeout(3000);
    
    // Try sending a second message to see if action buttons appear
    const followUpMessage = 'package status';
    console.log(`📝 Sending follow-up message: "${followUpMessage}"`);
    await chatFrame.getByRole('textbox', { name: 'Twoja wiadomość' }).fill(followUpMessage);
    await chatFrame.getByRole('button', { name: 'Send' }).click();
    console.log('✅ Follow-up message sent');
    
    // Wait for response and scrape
    console.log('⏳ Waiting for chatbot response...');
    await page.waitForTimeout(3000);
    
    // Scrape responses dynamically (include both messages in filter)
    const responses = await scrapeChatResponses(chatFrame, page, `${message} ${followUpMessage}`);
    
    // Wait a bit longer for action buttons to appear (they often load after the text response)
    console.log('⏳ Waiting for action buttons to load...');
    await page.waitForTimeout(4000); // Wait longer for action buttons to appear
    
    // Try to find action buttons in multiple ways
    console.log('🔍 Looking for action buttons in the chat...');
    
    // First try to find buttons/links that contain typical action text
    const quickActionTexts = await chatFrame.locator('*').allTextContents();
    const potentialActions = quickActionTexts.filter(text => {
      const cleanText = text.trim().toLowerCase();
      return cleanText.includes('package') || 
             cleanText.includes('status') || 
             cleanText.includes('courier') || 
             cleanText.includes('mobile') || 
             cleanText.includes('app') || 
             cleanText.includes('locker') || 
             cleanText.includes('point') || 
             cleanText.includes('find') || 
             cleanText.includes('track');
    });
    
    if (potentialActions.length > 0) {
      console.log('🎯 Found potential action texts:', potentialActions);
    }
    
    // Also try to find clickable elements (buttons, links, divs with click handlers)
    const clickableElements = await chatFrame.locator('button, a, [role="button"], [onclick], [class*="button"], [class*="action"]').allTextContents();
    const clickableWithText = clickableElements.filter(text => text.trim().length > 0);
    
    if (clickableWithText.length > 0) {
      console.log('🖱️ Found clickable elements with text:', clickableWithText);
    }
    
    const actionButtons = await scrapeActionButtons(chatFrame, page);
    
    // Display results
    console.log('📝 ========== MAIN SCENARIO RESULTS ==========');
    console.log(`Messages sent: "${message}" + "${followUpMessage}"`);
    console.log(`Bot responses found: ${responses.length}`);
    console.log(`Action buttons found: ${actionButtons.length}`);
    console.log('');
    
    console.log('🤖 Bot Responses:');
    responses.forEach((response, index) => {
      console.log(`   ${index + 1}. "${response}"`);
    });
    
    console.log('');
    console.log('📋 Action Buttons:');
    actionButtons.forEach((button, index) => {
      console.log(`   ${index + 1}. "${button}"`);
    });
    
    console.log('🎯 ==========================================');
    console.log('✅ Main MCP Server scenario completed successfully!');
  });

  test('MCP Server - Alternative scenario with dynamic scraping', async ({ page }) => {
    // Demonstrates MCP Server flexibility with different scenarios and dynamic scraping
    console.log('🚀 Starting alternative MCP Server scenario...');
    
    await page.goto('https://inpost.pl/kontakt');
    
    // Handle cookies if present
    try {
      await page.getByRole('button', { name: 'ACCEPT' }).click({ timeout: 5000 });
    } catch (error) {
      console.log('ℹ️ No cookies banner found');
    }
    
    await page.getByRole('button', { name: 'Zapytaj MATa' }).click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Chat' }).click();
    
    const chatFrame = page.locator('iframe[title="chatbot"]').contentFrame();
    await expect(chatFrame.getByRole('textbox', { name: 'Twoja wiadomość' })).toBeVisible();
    
    // Send different message to test MCP flexibility
    const testMessage = 'hello';
    console.log(`📝 Sending message: "${testMessage}"`);
    await chatFrame.getByRole('textbox', { name: 'Twoja wiadomość' }).fill(testMessage);
    await chatFrame.getByRole('button', { name: 'Send' }).click();
    
    await page.waitForTimeout(3000);
    
    // Dynamically scrape responses for alternative scenario using utility functions
    console.log('🔍 Scraping responses for alternative scenario...');
    
    const responses = await scrapeChatResponses(chatFrame, page, testMessage);
    const actionButtons = await scrapeActionButtons(chatFrame, page);
    
    console.log('📋 Alternative Scenario Results:');
    console.log(`   Message sent: "${testMessage}"`);
    console.log(`   Bot responses found: ${responses.length}`);
    console.log(`   Action buttons found: ${actionButtons.length}`);
    
    console.log('🤖 Responses:');
    responses.forEach((response, index) => {
      console.log(`   ${index + 1}. "${response}"`);
    });
    
    console.log('📋 Action Buttons:');
    actionButtons.forEach((button, index) => {
      console.log(`   ${index + 1}. "${button}"`);
    });
    
    console.log('🔄 MCP Server handled alternative scenario successfully');
  });
});