// ═══════════════════════════════════════════════════════════════
//  metro-data.js — Delhi Metro Network Data (Expanded: 8 Lines, 55+ Stations)
// ═══════════════════════════════════════════════════════════════

const METRO_LINES = {
    "Blue Line": {
        color: "#0078D7",
        stations: [
            "Dwarka Sector 21", "Dwarka", "Janakpuri West", "Janakpuri East",
            "Rajouri Garden", "Karol Bagh", "Rajiv Chowk", "Barakhamba Road",
            "Mandi House", "Pragati Maidan", "Indraprastha", "Yamuna Bank",
            "Noida Sector 15", "Noida City Centre"
        ],
        distances: [2.5, 1.8, 1.2, 2.1, 1.9, 2.5, 0.8, 1.5, 1.3, 1.7, 1.2, 4.5, 2.8]
    },
    "Red Line": {
        color: "#E21F26",
        stations: [
            "Rithala", "Rohini West", "Pitampura", "Kohat Enclave",
            "Netaji Subhash Place", "Inderlok", "Kashmere Gate",
            "Chandni Chowk", "New Delhi", "Central Secretariat"
        ],
        distances: [2.0, 1.5, 1.8, 2.2, 1.6, 3.0, 1.5, 1.8, 2.0]
    },
    "Yellow Line": {
        color: "#FFCB05",
        stations: [
            "Samaypur Badli", "Jahangirpuri", "Vishwavidyalaya",
            "Vidhan Sabha", "Kashmere Gate", "Chandni Chowk",
            "Rajiv Chowk", "Patel Chowk", "Central Secretariat",
            "Udyog Bhawan", "Hauz Khas", "Huda City Centre"
        ],
        distances: [1.8, 2.5, 1.2, 2.0, 1.5, 2.8, 1.0, 1.5, 1.8, 5.5, 8.0]
    },
    "Green Line": {
        color: "#00A550",
        stations: [
            "Mundka", "Rajdhani Park", "Nangloi", "Rajouri Garden",
            "Kirti Nagar", "Mandi House", "Indraprastha"
        ],
        distances: [2.5, 1.8, 4.0, 2.2, 3.5, 1.7]
    },
    "Violet Line": {
        color: "#8B4789",
        stations: [
            "Kashmere Gate", "Lal Quila", "Jama Masjid",
            "Mandi House", "Janpath", "Central Secretariat",
            "Khan Market", "Nehru Place", "Saket", "Badarpur"
        ],
        distances: [1.2, 0.8, 1.5, 1.0, 1.2, 1.5, 2.8, 2.5, 4.0]
    },
    "Magenta Line": {
        color: "#E5007D",
        stations: [
            "Janakpuri West", "Dabri Mor", "Dashrathpuri",
            "Palam", "Sadar Bazaar Cantonment", "Terminal 1 IGI Airport",
            "Shankar Vihar", "Hauz Khas", "Panchsheel Park",
            "Chirag Delhi", "Nehru Enclave", "Kalkaji Mandir",
            "Nehru Place", "Botanical Garden"
        ],
        distances: [1.5, 1.2, 1.8, 2.0, 2.5, 1.6, 4.2, 1.5, 1.0, 1.3, 1.8, 1.2, 3.5]
    },
    "Pink Line": {
        color: "#F17CB0",
        stations: [
            "Majlis Park", "Azadpur", "Netaji Subhash Place",
            "Shakti Nagar", "Punjabi Bagh West", "Rajouri Garden",
            "Maya Puri", "Naraina Vihar", "Delhi Cantt",
            "Durgabai Deshmukh South Campus", "Lajpat Nagar",
            "Saket", "Kalkaji Mandir"
        ],
        distances: [1.8, 2.0, 1.5, 2.2, 2.5, 1.8, 1.5, 2.0, 2.5, 3.0, 2.0, 1.5]
    },
    "Airport Express": {
        color: "#F48024",
        stations: [
            "New Delhi", "Shivaji Stadium", "Dhaula Kuan",
            "Delhi Aerocity", "Terminal 1 IGI Airport",
            "Dwarka Sector 21"
        ],
        distances: [1.5, 3.5, 4.0, 2.5, 5.0]
    }
};

// ═══════════════════════════════════════════════════════════════
//  Station positions for SVG map (schematic x,y coordinates)
//  Approximate relative positions inspired by actual DMRC map
// ═══════════════════════════════════════════════════════════════

const STATION_POSITIONS = {
    // Blue Line (West → East)
    "Dwarka Sector 21":     { x: 80,  y: 400 },
    "Dwarka":               { x: 130, y: 400 },
    "Janakpuri West":       { x: 180, y: 400 },
    "Janakpuri East":       { x: 230, y: 400 },
    "Rajouri Garden":       { x: 290, y: 370 },
    "Karol Bagh":           { x: 350, y: 340 },
    "Rajiv Chowk":          { x: 440, y: 310 },
    "Barakhamba Road":      { x: 490, y: 310 },
    "Mandi House":          { x: 530, y: 310 },
    "Pragati Maidan":       { x: 580, y: 330 },
    "Indraprastha":         { x: 620, y: 350 },
    "Yamuna Bank":          { x: 670, y: 370 },
    "Noida Sector 15":      { x: 740, y: 400 },
    "Noida City Centre":    { x: 810, y: 400 },

    // Red Line (North → South)
    "Rithala":              { x: 220, y: 60  },
    "Rohini West":          { x: 250, y: 90  },
    "Pitampura":            { x: 270, y: 120 },
    "Kohat Enclave":        { x: 290, y: 150 },
    "Netaji Subhash Place": { x: 310, y: 180 },
    "Inderlok":             { x: 340, y: 210 },
    "Kashmere Gate":        { x: 430, y: 200 },
    "Chandni Chowk":        { x: 440, y: 240 },
    "New Delhi":            { x: 420, y: 270 },
    "Central Secretariat":  { x: 410, y: 380 },

    // Yellow Line (North → South, unique stations)
    "Samaypur Badli":       { x: 380, y: 40  },
    "Jahangirpuri":         { x: 390, y: 70  },
    "Vishwavidyalaya":      { x: 400, y: 100 },
    "Vidhan Sabha":         { x: 410, y: 140 },
    "Patel Chowk":          { x: 430, y: 340 },
    "Udyog Bhawan":         { x: 420, y: 420 },
    "Hauz Khas":            { x: 380, y: 490 },
    "Huda City Centre":     { x: 350, y: 580 },

    // Green Line (West → Center)
    "Mundka":               { x: 80,  y: 280 },
    "Rajdhani Park":        { x: 130, y: 280 },
    "Nangloi":              { x: 180, y: 290 },
    "Kirti Nagar":          { x: 370, y: 360 },

    // Violet Line (unique stations)
    "Lal Quila":            { x: 470, y: 220 },
    "Jama Masjid":          { x: 500, y: 260 },
    "Janpath":              { x: 450, y: 350 },
    "Khan Market":          { x: 480, y: 410 },
    "Nehru Place":          { x: 520, y: 460 },
    "Saket":                { x: 470, y: 520 },
    "Badarpur":             { x: 560, y: 570 },

    // Magenta Line (unique stations)
    "Dabri Mor":            { x: 160, y: 440 },
    "Dashrathpuri":         { x: 150, y: 470 },
    "Palam":                { x: 150, y: 500 },
    "Sadar Bazaar Cantonment": { x: 170, y: 530 },
    "Terminal 1 IGI Airport":  { x: 200, y: 550 },
    "Shankar Vihar":        { x: 250, y: 540 },
    "Panchsheel Park":      { x: 370, y: 520 },
    "Chirag Delhi":         { x: 400, y: 490 },
    "Nehru Enclave":        { x: 440, y: 475 },
    "Kalkaji Mandir":       { x: 490, y: 490 },
    "Botanical Garden":     { x: 700, y: 460 },

    // Pink Line (unique stations)
    "Majlis Park":          { x: 260, y: 110 },
    "Azadpur":              { x: 290, y: 130 },
    "Shakti Nagar":         { x: 330, y: 200 },
    "Punjabi Bagh West":    { x: 280, y: 260 },
    "Maya Puri":            { x: 260, y: 340 },
    "Naraina Vihar":        { x: 250, y: 370 },
    "Delhi Cantt":          { x: 230, y: 410 },
    "Durgabai Deshmukh South Campus": { x: 340, y: 440 },
    "Lajpat Nagar":         { x: 430, y: 460 },

    // Airport Express (unique stations)
    "Shivaji Stadium":      { x: 380, y: 290 },
    "Dhaula Kuan":          { x: 280, y: 400 },
    "Delhi Aerocity":       { x: 200, y: 470 },
};

// Fare constants
const FARE_CONFIG = {
    baseFare: 10,
    perKmRate: 3,
    interchangeSurcharge: 5,
    peakHourSurcharge: 5,
    avgTimePerStop: 2.5,
    interchangeWalkTime: 4.0
};
