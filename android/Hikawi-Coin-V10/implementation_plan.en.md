# Hikawi Coin Redesign Plan

A comprehensive engineering and design vision document for **Hikawi Coin**, covering visual mockups, the six-section bottom navigation structure, the 27-seat voice-room system, the vertical live-streaming experience, the Moments feed, the Games Center, instant messaging, and the premium profile studio.

---

## User Review and Key Architectural Decisions

> [!IMPORTANT]
> **Current project inspection result:**
> The current project files and structure have been inspected. The repository contains a clean, new Android foundation built with Jetpack Compose; no previous services have been deleted and no databases have been replaced. The app will be built with a clean architecture that is ready for direct integration with Firebase and Agora, as requested, without affecting any future data.

- **Visual identity:** A luxurious royal style combining deep carbon black and polished metallic gold, with amber and ivory accents, clear Arabic typography, and full right-to-left (RTL) support.
- **Bottom navigation (6 sections, in order):**
  1. **Voice Rooms:** Promotional banner, featured and active rooms, search, and room creation.
  2. **Live Stream:** Interactive vertical video experience inspired by TikTok, with vertical scrolling, floating hearts, and live comments.
  3. **Moments:** A Facebook-style social feed for posts, media, and interactions.
  4. **Games:** A hub for multiplayer games and challenges (Ludo, Fortune Wheel, and room challenges), with leaderboards.
  5. **Messages:** A WhatsApp-style instant messaging experience with individual and group chats, plus voice notes.
  6. **Profile:** User profile, royal wallet (Coins and Diamonds), customization studio, and frame/title editing.

---

## Approved Visual Mockups

### 1. Voice Room Screen and 27-Seat System
![27-seat voice room preview](/src/assets/images/hikawi_voice_room_ui_1794035282353.jpg)

### 2. Main Navigation and Home Screen
![Home page and navigation preview](/src/assets/images/hikawi_home_nav_ui_1794035283314.jpg)

### 3. Interactive Live Streaming Experience (TikTok Style)
![Live streaming preview](/src/assets/images/hikawi_live_stream_ui_1794035304638.jpg)

### 4. Social Moments Feed
![Moments feed preview](/src/assets/images/hikawi_moments_ui_1794035306483.jpg)

### 5. Profile and Premium Customization Studio
![Profile and customization preview](/src/assets/images/hikawi_profile_edit_ui_1794035283515.jpg)

---

## 1. User Experience and Navigation Across the Six Sections

```
┌────────────────────────────────────────────────────────────────────────┐
│                    Hikawi Coin - Bottom Navigation                     │
│                                                                        │
│ [Profile] [Messages] [Games] [Moments] [Live Stream] [Rooms]           │
│    👤        💬        🎮       ❤️          📹          🎙️             │
└────────────────────────────────────────────────────────────────────────┘
```

### Premium Bottom Navigation Bar
- A polished floating background with a subtle dark-and-gold gradient and rounded edges (`RoundedCornerShape(24.dp)`).
- An active-state indicator with a golden glow and pulsing effect (`Golden Glow Effect`).
- Clear Arabic labels at 11sp, icons at 26dp, and comfortable touch targets of 48dp or larger.

---

## 2. Section Details and Features

### Section 1: Voice Rooms and Microphones (27 Seats)
- **VIP Audio Stage:**
  - **Host platform:** A prominent main seat with a golden crown and a speaking indicator waveform (`Audio Waveform`).
  - **27 seats:** Arranged in 3 balanced rows (9 seats per row), with circular gold frames and seat numbers (1–27).
  - **Seat states:** Available (+), speaking (pulsing gold ring), muted (slashed red microphone icon), and locked (gold lock).
  - **Bottom control panel:**
    - Personal microphone unmute/mute button with an interactive golden effect.
    - Microphone request button with a moderator-managed waiting queue.
    - Gift box with animated gift artwork (golden heart, luxury car, Hikawi falcon, royal crown).
    - Moderator list, permission assignment, and user kick/mute controls.

```
┌─────────────────────────────────────────────────────────────┐
│                       Voice Room Stage                      │
│                                                             │
│       👑 [Host - Level 50] 🌟 [Moderator 1] 🌟 [Moderator 2] │
│                                                             │
│ Row 1:  ( 1 ) ( 2 ) ( 3 ) ( 4 ) ( 5 ) ( 6 ) ( 7 ) ( 8 ) ( 9 ) │
│ Row 2:  (10) (11) (12) (13) (14) (15) (16) (17) (18)       │
│ Row 3:  (19) (20) (21) (22) (23) (24) (25) (26) (27)       │
│                                                             │
│ [Live room chat, greetings, and flowing gifts...]          │
│                                                             │
│ [Request Mic] [🎙️ Mute/Unmute] [🎁 Gifts] [Share] [Exit]    │
└─────────────────────────────────────────────────────────────┘
```

### Section 2: Live Stream
- Full-screen video with vertical scrolling to move quickly between content creators.
- A top bar containing the broadcaster's profile picture, follower count, quick Follow button, and top supporters list.
- Floating buttons along the right side (Like, Send Gifts, Share, and Filters).
- A bottom bar for writing comments and sending animated golden hearts.

### Section 3: Moments
- A top composer for sharing text, images, video clips, and voice messages.
- Premium social post cards with dark backgrounds and subtle gold borders.
- Interaction buttons: golden Like, Comment, and Share, with privacy, report, and block options.

### Section 4: Games Center
- Interactive game cards:
  - **Ludo Coin:** The classic game with a gold Arabic-inspired design and support for 2- or 4-player matches.
  - **Royal Fortune Wheel:** A daily opportunity to win Coins and Diamonds.
  - **Quiz and Speed Challenge:** Live competitions between room members.
- Daily and weekly leaderboards with prizes.

### Section 5: Messages
- Tabs for individual and group conversations.
- An instant messaging interface supporting text messages, voice-note recording with an audio waveform indicator, and image sharing.
- Message status indicators (Sent ✓, Delivered ✓✓, and Read in gold).

### Section 6: Profile and Customization Studio
- **Royal Wallet:** Coin balance (gold currency) and Diamond balance, with quick top-up and withdrawal buttons and a transaction history.
- **Live Customization Studio:**
  - Avatar frame previews (Golden Dragon Frame, Royal Falcon Frame, and Diamond Frame).
  - Colored chat bubble previews.
  - Royal honorary titles and special room-entry effects.
  - Screens for editing the display name, bio, profile picture, and cover, with a direct Save button.

---

## 3. Colors and Typography (Design Tokens)

| Element | Color Value | Description |
|---|---|---|
| **Deep Background** | `#0A0A0E` | Comfortable royal carbon black |
| **Card Background** | `#14141C` | Premium dark gray with a subtle gradient |
| **Primary Gold** | `#D4AF37` | Bright royal gold for buttons and active icons |
| **Light Gold** | `#F3E5AB` | Highlights, glow effects, and prominent text |
| **Diamonds** | `#4FC3F7` | Bright turquoise blue for Diamond balances |
| **Primary Text** | `#F5F5F7` | Pure ivory white for excellent readability |
| **Secondary Text** | `#9E9EA7` | Soft gray for details and dates |

---

## 4. Technical Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Hikawi Coin App                      │
│                                                        │
│  [MainActivity] (Compose Navigation & RTL Scaffolding) │
│        │                                               │
│        ├── [HikawiNavGraph] (State-driven Screen Host) │
│        │     ├── VoiceRoomsScreen & RoomDetailView     │
│        │     ├── LiveStreamVerticalFeedScreen          │
│        │     ├── MomentsFeedScreen & CreatePostDialog  │
│        │     ├── GamesHubScreen                        │
│        │     ├── ChatListScreen & ChatConversationView │
│        │     └── ProfileScreen & CustomizationStudio   │
│        │                                               │
│        ├── [HikawiViewModel] (Central State Machine)    │
│        │     ├── UserState (Coins, Diamonds, VIP Level)│
│        │     ├── RoomState (27 Mics, Agora Mock/Sync)  │
│        │     ├── LiveStreamState & Gifts Engine        │
│        │     └── Chat & Moments Repositories           │
│        │                                               │
│        └── [Data Layer & Services]                     │
│              ├── Firebase & Agora Interface Facades    │
│              └── Local Persistence & Mock Data Source  │
└────────────────────────────────────────────────────────┘
```

---

## Next Implementation Steps

After you review this document and the attached visual mockups and press the **Proceed** button:

1. Update `metadata.json` and the app name in `strings.xml` to **Hikawi Coin**.
2. Create the royal color system (`Theme.kt` and `Color.kt`) with full RTL support.
3. Build the premium six-section bottom navigation bar.
4. Implement all six screens, including the interactive 27-seat stage and the customization studio.
5. Verify that the project builds without compilation errors using `compile_applet`.
