-- Create neighbourhoods table for SEO-optimized location pages
-- Migration: Create neighbourhoods table and populate with London areas

-- 1. Create neighbourhoods table
CREATE TABLE IF NOT EXISTS neighbourhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL DEFAULT 'London',
  borough TEXT,
  description TEXT,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add neighbourhood_id FK to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS neighbourhood_id UUID REFERENCES neighbourhoods(id);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_neighbourhoods_city_slug ON neighbourhoods(city, slug);
CREATE INDEX IF NOT EXISTS idx_neighbourhoods_borough ON neighbourhoods(borough);
CREATE INDEX IF NOT EXISTS idx_restaurants_neighbourhood ON restaurants(neighbourhood_id);

-- 4. Insert London neighbourhoods with SEO metadata
INSERT INTO neighbourhoods (name, slug, city, borough, description, meta_title, meta_description) VALUES
-- Central London
('Soho', 'soho', 'London', 'Westminster', 'Vibrant entertainment district in the heart of London, known for its diverse dining scene, theatres, and lively atmosphere. Perfect for dog-friendly cafes and restaurants.', 'Dog-Friendly Restaurants in Soho, London | Dog Friendly Finder', 'Discover the best dog-friendly restaurants, cafes, and pubs in Soho. Find welcoming spots where you and your dog can enjoy great food in central London.'),
('Covent Garden', 'covent-garden', 'London', 'Westminster', 'Historic market area with street performers, boutique shops, and numerous restaurants. A bustling hub with plenty of outdoor seating options for dog owners.', 'Dog-Friendly Restaurants in Covent Garden | Dog Friendly Finder', 'Browse dog-friendly restaurants and cafes in Covent Garden. Find places with outdoor seating perfect for dining with your dog in this iconic London location.'),
('Fitzrovia', 'fitzrovia', 'London', 'Westminster', 'Stylish neighbourhood between Soho and Bloomsbury, known for its independent restaurants, media companies, and creative atmosphere.', 'Dog-Friendly Restaurants in Fitzrovia, London | Dog Friendly Finder', 'Explore dog-friendly dining in Fitzrovia. Find welcoming restaurants and cafes where your dog is part of the experience.'),
('Marylebone', 'marylebone', 'London', 'Westminster', 'Elegant village-like area with independent boutiques, cafes, and restaurants. Known for its charming high street and green spaces.', 'Dog-Friendly Restaurants in Marylebone | Dog Friendly Finder', 'Discover dog-friendly restaurants in Marylebone. Browse cafes, pubs, and dining spots that welcome you and your four-legged friend.'),
('Mayfair', 'mayfair', 'London', 'Westminster', 'Upscale district known for luxury hotels, fine dining, and exclusive members clubs. Home to some of London''s most prestigious restaurants.', 'Dog-Friendly Restaurants in Mayfair, London | Dog Friendly Finder', 'Find dog-friendly fine dining and cafes in Mayfair. Explore upscale restaurants that welcome dogs in this prestigious London neighbourhood.'),
('Westminster', 'westminster', 'London', 'Westminster', 'Political heart of London, home to Parliament, Westminster Abbey, and government buildings. Mix of tourist attractions and local dining.', 'Dog-Friendly Restaurants in Westminster | Dog Friendly Finder', 'Browse dog-friendly restaurants near Westminster. Find places to eat with your dog close to London''s iconic landmarks.'),
('Pimlico', 'pimlico', 'London', 'Westminster', 'Residential area south of Westminster with garden squares, independent shops, and neighbourhood restaurants.', 'Dog-Friendly Restaurants in Pimlico, London | Dog Friendly Finder', 'Discover dog-friendly dining in Pimlico. Find local cafes and restaurants that welcome dogs in this charming Westminster neighbourhood.'),
('Belgravia', 'belgravia', 'London', 'Westminster', 'Exclusive residential district known for grand white stucco terraces, embassies, and upscale restaurants.', 'Dog-Friendly Restaurants in Belgravia | Dog Friendly Finder', 'Find dog-friendly restaurants in Belgravia. Explore elegant dining spots that welcome you and your dog.'),

-- North London - Camden
('Camden Town', 'camden-town', 'London', 'Camden', 'Famous for its markets, live music venues, and alternative culture. Vibrant street food scene and canalside pubs perfect for dog walkers.', 'Dog-Friendly Restaurants in Camden Town | Dog Friendly Finder', 'Find the best dog-friendly restaurants, pubs, and cafes in Camden Town. Discover places with outdoor seating and welcoming atmospheres for dogs.'),
('Primrose Hill', 'primrose-hill', 'London', 'Camden', 'Affluent area with a village feel, known for its namesake park with panoramic London views. Home to independent cafes and restaurants.', 'Dog-Friendly Restaurants in Primrose Hill | Dog Friendly Finder', 'Explore dog-friendly cafes and restaurants in Primrose Hill. Perfect spots for post-park walks with your dog.'),
('Hampstead', 'hampstead', 'London', 'Camden', 'Historic village on a hill with the Heath, independent shops, and traditional pubs. Known for its literary heritage and stunning green spaces.', 'Dog-Friendly Pubs & Restaurants in Hampstead | Dog Friendly Finder', 'Discover dog-friendly pubs and restaurants in Hampstead. Find welcoming spots near the Heath for you and your dog.'),
('Kentish Town', 'kentish-town', 'London', 'Camden', 'Diverse neighbourhood with live music venues, independent shops, and a mix of traditional and modern eateries.', 'Dog-Friendly Restaurants in Kentish Town | Dog Friendly Finder', 'Browse dog-friendly restaurants and pubs in Kentish Town. Find local spots that welcome dogs.'),
('Chalk Farm', 'chalk-farm', 'London', 'Camden', 'Area bordering Camden Lock with music venues, markets, and canal-side walks. Great for dog-friendly outdoor dining.', 'Dog-Friendly Restaurants in Chalk Farm, London | Dog Friendly Finder', 'Find dog-friendly cafes and restaurants in Chalk Farm. Explore canal-side dining perfect for dog owners.'),
('Belsize Park', 'belsize-park', 'London', 'Camden', 'Leafy residential area between Hampstead and Primrose Hill, known for its village atmosphere and independent restaurants.', 'Dog-Friendly Restaurants in Belsize Park | Dog Friendly Finder', 'Discover dog-friendly dining in Belsize Park. Find welcoming cafes and restaurants in this charming neighbourhood.'),
('West Hampstead', 'west-hampstead', 'London', 'Camden', 'Residential area with three transport hubs, diverse dining options, and a strong community feel.', 'Dog-Friendly Restaurants in West Hampstead | Dog Friendly Finder', 'Browse dog-friendly restaurants in West Hampstead. Find local spots that welcome you and your dog.'),
('Swiss Cottage', 'swiss-cottage', 'London', 'Camden', 'Residential area named after a historic Swiss-style pub, with libraries, leisure centres, and neighbourhood restaurants.', 'Dog-Friendly Restaurants in Swiss Cottage | Dog Friendly Finder', 'Find dog-friendly cafes and restaurants in Swiss Cottage, London.'),

-- North London - Islington
('Islington', 'islington', 'London', 'Islington', 'Trendy area known for its Victorian architecture, independent shops, and vibrant restaurant scene along Upper Street.', 'Dog-Friendly Restaurants in Islington, London | Dog Friendly Finder', 'Discover dog-friendly restaurants and cafes in Islington. Browse Upper Street and beyond for welcoming spots.'),
('Angel', 'angel', 'London', 'Islington', 'Busy area centered around the Angel tube station, with shops, restaurants, and the Business Design Centre.', 'Dog-Friendly Restaurants in Angel, Islington | Dog Friendly Finder', 'Find dog-friendly restaurants and pubs in Angel. Explore dining options that welcome dogs.'),
('Highbury', 'highbury', 'London', 'Islington', 'Residential area known for Arsenal FC, Highbury Fields park, and neighbourhood cafes and restaurants.', 'Dog-Friendly Restaurants in Highbury, London | Dog Friendly Finder', 'Browse dog-friendly cafes and restaurants in Highbury. Perfect for post-walk dining with your dog.'),
('Barnsbury', 'barnsbury', 'London', 'Islington', 'Quiet residential area with Georgian squares and local pubs, bordering Islington and King''s Cross.', 'Dog-Friendly Restaurants in Barnsbury | Dog Friendly Finder', 'Discover dog-friendly pubs and cafes in Barnsbury, Islington.'),
('Canonbury', 'canonbury', 'London', 'Islington', 'Peaceful residential area with period houses, Canonbury Square, and independent shops and cafes.', 'Dog-Friendly Restaurants in Canonbury, London | Dog Friendly Finder', 'Find dog-friendly restaurants in Canonbury. Explore local dining spots that welcome dogs.'),
('Archway', 'archway', 'London', 'Islington', 'North London neighbourhood with a mix of housing, local shops, and easy access to Hampstead Heath.', 'Dog-Friendly Restaurants in Archway, London | Dog Friendly Finder', 'Browse dog-friendly restaurants and cafes in Archway, perfect for Heath walkers.'),

-- East London - Hackney
('Shoreditch', 'shoreditch', 'London', 'Hackney', 'Hipster haven known for street art, tech startups, vintage shops, and innovative restaurants. A creative hub with trendy dog-friendly cafes.', 'Dog-Friendly Restaurants in Shoreditch | Dog Friendly Finder', 'Find the best dog-friendly restaurants and cafes in Shoreditch. Explore trendy spots that welcome dogs in East London.'),
('Hackney', 'hackney', 'London', 'Hackney', 'Diverse area with parks, markets, independent shops, and a thriving food scene from traditional cafes to modern restaurants.', 'Dog-Friendly Restaurants in Hackney, London | Dog Friendly Finder', 'Discover dog-friendly restaurants and cafes in Hackney. Find welcoming spots across this vibrant East London borough.'),
('Dalston', 'dalston', 'London', 'Hackney', 'Multicultural neighbourhood known for its nightlife, music venues, street food markets, and diverse dining scene.', 'Dog-Friendly Restaurants in Dalston, London | Dog Friendly Finder', 'Browse dog-friendly cafes and restaurants in Dalston. Find eclectic dining spots that welcome dogs.'),
('Hoxton', 'hoxton', 'London', 'Hackney', 'Trendy area adjacent to Shoreditch, known for its creative scene, galleries, and contemporary restaurants.', 'Dog-Friendly Restaurants in Hoxton, London | Dog Friendly Finder', 'Find dog-friendly restaurants in Hoxton. Explore contemporary dining that welcomes you and your dog.'),
('Stoke Newington', 'stoke-newington', 'London', 'Hackney', 'Bohemian neighbourhood with vintage shops, independent cafes, Church Street, and Clissold Park perfect for dog walks.', 'Dog-Friendly Restaurants in Stoke Newington | Dog Friendly Finder', 'Discover dog-friendly cafes and restaurants in Stoke Newington. Perfect for park walks with your dog.'),
('Clapton', 'clapton', 'London', 'Hackney', 'Residential area with Clapton Pond, independent cafes, and proximity to the River Lea and marshes.', 'Dog-Friendly Restaurants in Clapton, London | Dog Friendly Finder', 'Browse dog-friendly restaurants in Clapton. Find spots near the marshes for dog walkers.'),
('Hackney Wick', 'hackney-wick', 'London', 'Hackney', 'Creative quarter by the Olympic Park and canals, known for its artist studios, breweries, and waterside dining.', 'Dog-Friendly Restaurants in Hackney Wick | Dog Friendly Finder', 'Find dog-friendly canal-side restaurants in Hackney Wick, perfect for waterside walks.'),

-- East London - Tower Hamlets
('Shoreditch', 'bethnal-green', 'London', 'Tower Hamlets', 'Diverse East London area with the Museum of Childhood, Victoria Park nearby, and a mix of traditional and modern eateries.', 'Dog-Friendly Restaurants in Bethnal Green | Dog Friendly Finder', 'Discover dog-friendly restaurants in Bethnal Green. Find spots near Victoria Park for dog owners.'),
('Whitechapel', 'whitechapel', 'London', 'Tower Hamlets', 'Historic area with a diverse food scene, markets, and close to the City. Mix of traditional and contemporary dining.', 'Dog-Friendly Restaurants in Whitechapel, London | Dog Friendly Finder', 'Browse dog-friendly restaurants in Whitechapel, East London.'),
('Spitalfields', 'spitalfields', 'London', 'Tower Hamlets', 'Historic market area with trendy shops, restaurants, and Georgian architecture. Popular for brunch and independent cafes.', 'Dog-Friendly Restaurants in Spitalfields | Dog Friendly Finder', 'Find dog-friendly cafes and restaurants in Spitalfields. Explore market-side dining that welcomes dogs.'),
('Brick Lane', 'brick-lane', 'London', 'Tower Hamlets', 'Famous for its curry houses, vintage markets, street art, and multicultural atmosphere. A foodie destination.', 'Dog-Friendly Restaurants on Brick Lane, London | Dog Friendly Finder', 'Discover dog-friendly restaurants and cafes on Brick Lane. Find welcoming curry houses and more.'),
('Canary Wharf', 'canary-wharf', 'London', 'Tower Hamlets', 'Modern financial district with skyscrapers, shopping malls, and waterside restaurants. Business hub with outdoor dining options.', 'Dog-Friendly Restaurants in Canary Wharf | Dog Friendly Finder', 'Find dog-friendly restaurants in Canary Wharf. Explore waterside and mall dining that welcomes dogs.'),
('Limehouse', 'limehouse', 'London', 'Tower Hamlets', 'Historic docklands area with canal-side pubs, proximity to the Thames, and a mix of traditional and modern venues.', 'Dog-Friendly Pubs in Limehouse, London | Dog Friendly Finder', 'Browse dog-friendly canal-side pubs and restaurants in Limehouse.'),
('Wapping', 'wapping', 'London', 'Tower Hamlets', 'Riverside area with converted warehouses, historic pubs, and Thames Path walks perfect for dogs.', 'Dog-Friendly Pubs in Wapping, London | Dog Friendly Finder', 'Discover dog-friendly riverside pubs in Wapping. Perfect for Thames Path walks.'),

-- South London - Southwark
('Borough', 'borough', 'London', 'Southwark', 'Home to Borough Market, one of London''s oldest food markets. Diverse food scene with restaurants, pubs, and The Shard nearby.', 'Dog-Friendly Restaurants in Borough, London | Dog Friendly Finder', 'Find dog-friendly restaurants and pubs near Borough Market. Explore spots that welcome dogs.'),
('Bankside', 'bankside', 'London', 'Southwark', 'Thames-side cultural quarter with Tate Modern, Globe Theatre, and riverside restaurants with views.', 'Dog-Friendly Restaurants in Bankside, London | Dog Friendly Finder', 'Discover dog-friendly riverside restaurants in Bankside. Perfect for South Bank walks.'),
('Bermondsey', 'bermondsey', 'London', 'Southwark', 'Trendy area with converted warehouses, independent cafes, food markets, and proximity to Tower Bridge.', 'Dog-Friendly Restaurants in Bermondsey | Dog Friendly Finder', 'Browse dog-friendly cafes and restaurants in Bermondsey. Find welcoming spots in this trendy area.'),
('Peckham', 'peckham', 'London', 'Southwark', 'Vibrant multicultural area known for Peckham Rye Park, rooftop bars, independent shops, and diverse food scene.', 'Dog-Friendly Restaurants in Peckham, London | Dog Friendly Finder', 'Find dog-friendly restaurants and cafes in Peckham. Explore diverse dining near the park.'),
('Camberwell', 'camberwell', 'London', 'Southwark', 'Residential area with the art college, Camberwell Green, and a mix of independent cafes and traditional pubs.', 'Dog-Friendly Restaurants in Camberwell | Dog Friendly Finder', 'Discover dog-friendly cafes and pubs in Camberwell, South London.'),
('Dulwich', 'dulwich', 'London', 'Southwark', 'Leafy suburban area with Dulwich Park, Dulwich Picture Gallery, independent shops, and village-like atmosphere.', 'Dog-Friendly Restaurants in Dulwich, London | Dog Friendly Finder', 'Browse dog-friendly restaurants in Dulwich. Perfect for park walks with your dog.'),
('East Dulwich', 'east-dulwich', 'London', 'Southwark', 'Popular residential area with Lordship Lane''s independent shops, restaurants, delis, and Peckham Rye Park.', 'Dog-Friendly Restaurants in East Dulwich | Dog Friendly Finder', 'Find dog-friendly cafes and restaurants on Lordship Lane, East Dulwich.'),

-- South London - Lambeth
('Waterloo', 'waterloo', 'London', 'Lambeth', 'Major transport hub with South Bank cultural venues, riverside dining, and proximity to Westminster.', 'Dog-Friendly Restaurants in Waterloo, London | Dog Friendly Finder', 'Discover dog-friendly South Bank restaurants near Waterloo. Find riverside spots for you and your dog.'),
('Brixton', 'brixton', 'London', 'Lambeth', 'Multicultural neighbourhood famous for Brixton Market, live music venues, and diverse food from around the world.', 'Dog-Friendly Restaurants in Brixton, London | Dog Friendly Finder', 'Find dog-friendly restaurants and cafes in Brixton. Explore the diverse food scene with your dog.'),
('Clapham', 'clapham', 'London', 'Lambeth', 'Residential area with Clapham Common, the Old Town, and High Street lined with restaurants, pubs, and cafes.', 'Dog-Friendly Restaurants in Clapham, London | Dog Friendly Finder', 'Browse dog-friendly restaurants in Clapham. Perfect for Common walks and dining with your dog.'),
('Kennington', 'kennington', 'London', 'Lambeth', 'Residential area home to the Oval cricket ground, Kennington Park, and traditional pubs.', 'Dog-Friendly Pubs in Kennington, London | Dog Friendly Finder', 'Discover dog-friendly pubs and restaurants near Kennington Park.'),
('Stockwell', 'stockwell', 'London', 'Lambeth', 'Diverse neighbourhood between Brixton and Clapham with multicultural food scene and local markets.', 'Dog-Friendly Restaurants in Stockwell, London | Dog Friendly Finder', 'Find dog-friendly restaurants in Stockwell, South London.'),
('Vauxhall', 'vauxhall', 'London', 'Lambeth', 'Riverside area with park, transport hub, new developments, and proximity to the Thames Path.', 'Dog-Friendly Restaurants in Vauxhall | Dog Friendly Finder', 'Browse dog-friendly riverside restaurants in Vauxhall, London.'),

-- South London - Wandsworth
('Battersea', 'battersea', 'London', 'Wandsworth', 'Riverside area with Battersea Park and Power Station, mix of residential streets and new developments.', 'Dog-Friendly Restaurants in Battersea | Dog Friendly Finder', 'Find dog-friendly restaurants near Battersea Park. Perfect for park walks with your dog.'),
('Clapham Junction', 'clapham-junction', 'London', 'Wandsworth', 'Major transport hub and shopping area with diverse restaurants and proximity to Clapham Common.', 'Dog-Friendly Restaurants near Clapham Junction | Dog Friendly Finder', 'Discover dog-friendly dining near Clapham Junction, London.'),
('Wandsworth', 'wandsworth', 'London', 'Wandsworth', 'Residential area with the Old Town, riverside walks, and Wandsworth Common popular with dog walkers.', 'Dog-Friendly Restaurants in Wandsworth | Dog Friendly Finder', 'Browse dog-friendly restaurants in Wandsworth Town and by the Common.'),
('Balham', 'balham', 'London', 'Wandsworth', 'Residential neighbourhood with Balham High Road''s restaurants and bars, and Tooting Bec Common nearby.', 'Dog-Friendly Restaurants in Balham, London | Dog Friendly Finder', 'Find dog-friendly restaurants and pubs in Balham, South London.'),
('Tooting', 'tooting', 'London', 'Wandsworth', 'Vibrant multicultural area with Tooting Market, curry houses, Tooting Bec Common, and diverse food scene.', 'Dog-Friendly Restaurants in Tooting, London | Dog Friendly Finder', 'Discover dog-friendly restaurants in Tooting. Explore diverse dining near the Common.'),
('Putney', 'putney', 'London', 'Wandsworth', 'Thames-side area known for the Boat Race start, riverside pubs, Putney Heath, and strong community feel.', 'Dog-Friendly Pubs in Putney, London | Dog Friendly Finder', 'Find dog-friendly riverside pubs and restaurants in Putney. Perfect for Thames walks.'),
('Earlsfield', 'earlsfield', 'London', 'Wandsworth', 'Residential area with Garratt Lane''s independent shops and cafes, and Wandsworth Common for dog walks.', 'Dog-Friendly Cafes in Earlsfield | Dog Friendly Finder', 'Browse dog-friendly cafes and restaurants in Earlsfield, near Wandsworth Common.'),

-- West London - Kensington and Chelsea
('Kensington', 'kensington', 'London', 'Kensington and Chelsea', 'Upscale area with museums (V&A, Natural History), Kensington High Street, and elegant restaurants.', 'Dog-Friendly Restaurants in Kensington | Dog Friendly Finder', 'Find dog-friendly restaurants in Kensington. Explore elegant dining near the museums.'),
('South Kensington', 'south-kensington', 'London', 'Kensington and Chelsea', 'Cultural hub with museums, French bistros, upscale cafes, and proximity to Hyde Park.', 'Dog-Friendly Restaurants in South Kensington | Dog Friendly Finder', 'Discover dog-friendly cafes and restaurants in South Kensington, near the museums.'),
('Chelsea', 'chelsea', 'London', 'Kensington and Chelsea', 'Affluent riverside area with King''s Road shopping, fine dining, and the Chelsea Flower Show location.', 'Dog-Friendly Restaurants in Chelsea, London | Dog Friendly Finder', 'Browse dog-friendly restaurants on King''s Road and beyond in Chelsea.'),
('Notting Hill', 'notting-hill', 'London', 'Kensington and Chelsea', 'Famous for Portobello Road Market, colourful houses, antique shops, and diverse restaurants. Host of the annual Carnival.', 'Dog-Friendly Restaurants in Notting Hill | Dog Friendly Finder', 'Find dog-friendly cafes and restaurants in Notting Hill. Explore Portobello Road with your dog.'),
('Holland Park', 'holland-park', 'London', 'Kensington and Chelsea', 'Quiet residential area with the namesake park, elegant terraces, and upscale restaurants.', 'Dog-Friendly Restaurants in Holland Park | Dog Friendly Finder', 'Discover dog-friendly dining near Holland Park, perfect for post-walk meals.'),
('Knightsbridge', 'knightsbridge', 'London', 'Kensington and Chelsea', 'Luxury shopping district home to Harrods, Harvey Nichols, and high-end restaurants.', 'Dog-Friendly Restaurants in Knightsbridge | Dog Friendly Finder', 'Find dog-friendly restaurants in Knightsbridge. Explore upscale dining that welcomes dogs.'),
('Earl''s Court', 'earls-court', 'London', 'Kensington and Chelsea', 'Diverse area with exhibition centre, international restaurants, and good transport links.', 'Dog-Friendly Restaurants in Earl''s Court | Dog Friendly Finder', 'Browse dog-friendly restaurants in Earl''s Court, West London.'),
('Fulham', 'fulham', 'London', 'Hammersmith and Fulham', 'Riverside residential area with parks, Fulham Palace, independent shops, and neighbourhood restaurants.', 'Dog-Friendly Restaurants in Fulham, London | Dog Friendly Finder', 'Find dog-friendly restaurants in Fulham. Perfect for riverside and park walks with dogs.'),

-- West London - Hammersmith and Fulham
('Hammersmith', 'hammersmith', 'London', 'Hammersmith and Fulham', 'Riverside area with transport hub, Apollo theatre, riverside pubs, and mix of chain and independent restaurants.', 'Dog-Friendly Restaurants in Hammersmith | Dog Friendly Finder', 'Discover dog-friendly riverside pubs and restaurants in Hammersmith.'),
('Shepherd''s Bush', 'shepherds-bush', 'London', 'Hammersmith and Fulham', 'Diverse area with Westfield shopping centre, market, music venues, and multicultural dining.', 'Dog-Friendly Restaurants in Shepherd''s Bush | Dog Friendly Finder', 'Browse dog-friendly restaurants near Shepherd''s Bush market and Westfield.'),
('Brook Green', 'brook-green', 'London', 'Hammersmith and Fulham', 'Leafy residential area centered around the green, with independent cafes and local pubs.', 'Dog-Friendly Cafes in Brook Green, London | Dog Friendly Finder', 'Find dog-friendly cafes and restaurants around Brook Green.'),

-- North West London - Brent
('Kilburn', 'kilburn', 'London', 'Brent', 'Diverse high street area with Irish heritage, mix of traditional pubs and international restaurants.', 'Dog-Friendly Pubs in Kilburn, London | Dog Friendly Finder', 'Discover dog-friendly pubs and restaurants in Kilburn, North West London.'),
('Willesden', 'willesden', 'London', 'Brent', 'Residential area with multicultural community, Willesden Green library, and diverse food scene.', 'Dog-Friendly Restaurants in Willesden | Dog Friendly Finder', 'Find dog-friendly restaurants in Willesden, Brent.'),
('Wembley', 'wembley', 'London', 'Brent', 'Home to Wembley Stadium and Arena, with diverse restaurants along Ealing Road and around the stadium.', 'Dog-Friendly Restaurants in Wembley | Dog Friendly Finder', 'Browse dog-friendly restaurants near Wembley Stadium and beyond.'),

-- North West London - Barnet
('Finchley', 'finchley', 'London', 'Barnet', 'Residential North London area with East Finchley, North Finchley, and Church End, mix of local shops and restaurants.', 'Dog-Friendly Restaurants in Finchley | Dog Friendly Finder', 'Find dog-friendly cafes and restaurants in Finchley, North London.'),
('Golders Green', 'golders-green', 'London', 'Barnet', 'Diverse area with large Jewish community, bagel shops, delis, and access to Hampstead Heath extension.', 'Dog-Friendly Restaurants in Golders Green | Dog Friendly Finder', 'Discover dog-friendly dining in Golders Green, near the Heath.'),
('Muswell Hill', 'muswell-hill', 'London', 'Haringey', 'Leafy hilltop area with Broadway''s independent shops and cafes, and Alexandra Palace nearby.', 'Dog-Friendly Cafes in Muswell Hill | Dog Friendly Finder', 'Browse dog-friendly cafes and restaurants in Muswell Hill, North London.'),
('Crouch End', 'crouch-end', 'London', 'Haringey', 'Trendy neighbourhood with independent shops, cafes, restaurants, and Parkland Walk for dog walking.', 'Dog-Friendly Restaurants in Crouch End | Dog Friendly Finder', 'Find dog-friendly restaurants in Crouch End. Perfect for Parkland Walk dog walkers.'),
('Highgate', 'highgate', 'London', 'Haringey', 'Historic village on a hill with the famous cemetery, Hampstead Heath access, and traditional pubs.', 'Dog-Friendly Pubs in Highgate, London | Dog Friendly Finder', 'Discover dog-friendly pubs in Highgate. Perfect for Heath walks with your dog.'),
('Tottenham', 'tottenham', 'London', 'Haringey', 'Diverse area with Tottenham Hotspur stadium, Bruce Castle Park, and multicultural food scene.', 'Dog-Friendly Restaurants in Tottenham | Dog Friendly Finder', 'Browse dog-friendly restaurants in Tottenham, North London.'),

-- East London - Newham
('Stratford', 'stratford', 'London', 'Newham', 'Regenerated area with Westfield shopping centre, Olympic Park, and diverse dining options.', 'Dog-Friendly Restaurants in Stratford, London | Dog Friendly Finder', 'Find dog-friendly restaurants in Stratford. Explore Olympic Park with your dog.'),

-- South East London - Lewisham
('Lewisham', 'lewisham', 'London', 'Lewisham', 'Diverse South London area with shopping centre, market, and multicultural restaurants.', 'Dog-Friendly Restaurants in Lewisham | Dog Friendly Finder', 'Discover dog-friendly restaurants in Lewisham, South East London.'),
('Deptford', 'deptford', 'London', 'Lewisham', 'Historic docks area with markets, independent cafes, street food, and creative scene.', 'Dog-Friendly Cafes in Deptford, London | Dog Friendly Finder', 'Find dog-friendly cafes and street food in Deptford''s markets.'),
('Greenwich', 'greenwich', 'London', 'Greenwich', 'Historic riverside town with the Royal Observatory, Cutty Sark, Greenwich Market, and park perfect for dogs.', 'Dog-Friendly Restaurants in Greenwich | Dog Friendly Finder', 'Browse dog-friendly restaurants in Greenwich. Perfect for park and riverside walks.'),
('Blackheath', 'blackheath', 'London', 'Lewisham', 'Affluent area centered around the heath, with independent shops, cafes, and traditional pubs.', 'Dog-Friendly Restaurants in Blackheath | Dog Friendly Finder', 'Find dog-friendly cafes and pubs around Blackheath. Perfect for heath walks with dogs.'),
('Forest Hill', 'forest-hill', 'London', 'Lewisham', 'Residential area with Horniman Museum, independent shops along the high street, and local cafes.', 'Dog-Friendly Cafes in Forest Hill, London | Dog Friendly Finder', 'Discover dog-friendly cafes in Forest Hill, South East London.'),

-- South East London - Greenwich
('Woolwich', 'woolwich', 'London', 'Greenwich', 'Riverside area with Royal Arsenal development, market, and diverse dining scene.', 'Dog-Friendly Restaurants in Woolwich | Dog Friendly Finder', 'Browse dog-friendly restaurants in Woolwich, South East London.'),

-- South London - Croydon
('Croydon', 'croydon', 'London', 'Croydon', 'South London town with shopping centres, BoxPark street food, and transport hub.', 'Dog-Friendly Restaurants in Croydon | Dog Friendly Finder', 'Find dog-friendly restaurants in Croydon. Explore BoxPark and beyond with your dog.'),

-- South West London - Richmond
('Richmond', 'richmond', 'London', 'Richmond upon Thames', 'Elegant riverside town with Richmond Park (largest Royal Park), boutique shops, and upscale restaurants.', 'Dog-Friendly Restaurants in Richmond | Dog Friendly Finder', 'Discover dog-friendly restaurants in Richmond. Perfect for Richmond Park walks with your dog.'),
('Twickenham', 'twickenham', 'London', 'Richmond upon Thames', 'Riverside area famous for rugby stadium, Twickenham Green, and traditional pubs.', 'Dog-Friendly Pubs in Twickenham | Dog Friendly Finder', 'Find dog-friendly riverside pubs in Twickenham, South West London.'),
('Teddington', 'teddington', 'London', 'Richmond upon Thames', 'Suburban area with village feel, high street shops, Bushy Park nearby, and family-friendly restaurants.', 'Dog-Friendly Restaurants in Teddington | Dog Friendly Finder', 'Browse dog-friendly restaurants in Teddington, near Bushy Park.'),
('Kew', 'kew', 'London', 'Richmond upon Thames', 'Riverside area home to Kew Gardens, independent shops, cafes, and traditional pubs.', 'Dog-Friendly Cafes in Kew, London | Dog Friendly Finder', 'Find dog-friendly cafes near Kew Gardens (note: dogs not allowed in main gardens).'),
('Barnes', 'barnes', 'London', 'Richmond upon Thames', 'Affluent riverside village with pond, independent shops, gastropubs, and strong community.', 'Dog-Friendly Pubs in Barnes, London | Dog Friendly Finder', 'Discover dog-friendly pubs in Barnes. Perfect for pond and riverside walks.'),

-- South West London - Kingston
('Kingston upon Thames', 'kingston-upon-thames', 'London', 'Kingston upon Thames', 'Historic market town with riverside location, large shopping centre, and diverse restaurants.', 'Dog-Friendly Restaurants in Kingston upon Thames | Dog Friendly Finder', 'Find dog-friendly restaurants in Kingston. Explore riverside dining with your dog.'),
('Surbiton', 'surbiton', 'London', 'Kingston upon Thames', 'Suburban area with art deco architecture, independent shops, and riverside walks.', 'Dog-Friendly Restaurants in Surbiton | Dog Friendly Finder', 'Browse dog-friendly cafes and restaurants in Surbiton, South West London.'),

-- South West London - Merton
('Wimbledon', 'wimbledon', 'London', 'Merton', 'Famous for tennis championships, with Wimbledon Common for dog walks, the Village, and Broadway shopping.', 'Dog-Friendly Restaurants in Wimbledon | Dog Friendly Finder', 'Discover dog-friendly restaurants in Wimbledon. Perfect for Common walks with your dog.'),
('Wimbledon Village', 'wimbledon-village', 'London', 'Merton', 'Upscale area with boutique shops, cafes, restaurants, and proximity to Wimbledon Common.', 'Dog-Friendly Cafes in Wimbledon Village | Dog Friendly Finder', 'Find dog-friendly cafes in Wimbledon Village, near the Common.'),
('Colliers Wood', 'colliers-wood', 'London', 'Merton', 'Residential area with shopping, access to Wandle Trail for dog walks, and local restaurants.', 'Dog-Friendly Restaurants in Colliers Wood | Dog Friendly Finder', 'Browse dog-friendly restaurants in Colliers Wood, near Wandle Trail.'),

-- West London - Ealing
('Ealing', 'ealing', 'London', 'Ealing', 'West London area known as the "Queen of the Suburbs", with Ealing Broadway, Walpole Park, and diverse restaurants.', 'Dog-Friendly Restaurants in Ealing, London | Dog Friendly Finder', 'Find dog-friendly restaurants in Ealing. Explore dining near Walpole Park.'),
('Acton', 'acton', 'London', 'Ealing', 'Residential area with diverse community, local parks, and mix of independent and chain restaurants.', 'Dog-Friendly Restaurants in Acton, London | Dog Friendly Finder', 'Discover dog-friendly cafes and restaurants in Acton, West London.'),

-- West London - Hounslow
('Chiswick', 'chiswick', 'London', 'Hounslow', 'Leafy riverside area with independent shops, gastropubs, Chiswick House gardens, and strong foodie scene.', 'Dog-Friendly Restaurants in Chiswick | Dog Friendly Finder', 'Browse dog-friendly gastropubs and restaurants in Chiswick. Perfect for riverside walks.'),
('Brentford', 'brentford', 'London', 'Hounslow', 'Historic town at the confluence of the Brent and Thames, with canalside pubs and redevelopment.', 'Dog-Friendly Canal Pubs in Brentford | Dog Friendly Finder', 'Find dog-friendly canal-side pubs in Brentford, West London.'),

-- North London - Enfield
('Enfield', 'enfield', 'London', 'Enfield', 'North London area with market town centre, parks, and local restaurants.', 'Dog-Friendly Restaurants in Enfield | Dog Friendly Finder', 'Find dog-friendly restaurants in Enfield, North London.'),

-- East London - Waltham Forest
('Walthamstow', 'walthamstow', 'London', 'Waltham Forest', 'East London area with Walthamstow Market (longest street market), Wetlands nature reserve, and diverse dining.', 'Dog-Friendly Restaurants in Walthamstow | Dog Friendly Finder', 'Discover dog-friendly restaurants in Walthamstow. Explore market dining and Wetlands.'),
('Leyton', 'leyton', 'London', 'Waltham Forest', 'Residential area with Lea Bridge, independent cafes, and access to Lee Valley for dog walks.', 'Dog-Friendly Cafes in Leyton, London | Dog Friendly Finder', 'Browse dog-friendly cafes in Leyton, near Lee Valley.'),
('Leytonstone', 'leytonstone', 'London', 'Waltham Forest', 'Residential East London area with Epping Forest nearby, local high street, and community feel.', 'Dog-Friendly Restaurants in Leytonstone | Dog Friendly Finder', 'Find dog-friendly restaurants in Leytonstone, near Epping Forest.'),

-- East London - Redbridge
('Ilford', 'ilford', 'London', 'Redbridge', 'Diverse East London area with shopping, Valentines Park, and multicultural food scene.', 'Dog-Friendly Restaurants in Ilford | Dog Friendly Finder', 'Discover dog-friendly restaurants in Ilford. Explore dining near Valentines Park.'),

-- East London - Barking and Dagenham
('Barking', 'barking', 'London', 'Barking and Dagenham', 'Historic riverside town with market, Abbey ruins, and local restaurants.', 'Dog-Friendly Restaurants in Barking | Dog Friendly Finder', 'Browse dog-friendly restaurants in Barking, East London.'),

-- East London - Havering
('Romford', 'romford', 'London', 'Havering', 'Outer East London town with market, shopping, and local dining scene.', 'Dog-Friendly Restaurants in Romford | Dog Friendly Finder', 'Find dog-friendly restaurants in Romford, East London.'),

-- North West London - Harrow
('Harrow', 'harrow', 'London', 'Harrow', 'Hilltop North West London area with Harrow School, shopping centre, and diverse restaurants.', 'Dog-Friendly Restaurants in Harrow | Dog Friendly Finder', 'Discover dog-friendly restaurants in Harrow, North West London.'),

-- South East London - Bexley
('Bexleyheath', 'bexleyheath', 'London', 'Bexley', 'South East London area with shopping, Red House (William Morris), and local dining.', 'Dog-Friendly Restaurants in Bexleyheath | Dog Friendly Finder', 'Browse dog-friendly restaurants in Bexleyheath, South East London.'),

-- South London - Bromley
('Bromley', 'bromley', 'London', 'Bromley', 'South London town with shopping, Churchill Theatre, and Norman Park for dog walks.', 'Dog-Friendly Restaurants in Bromley | Dog Friendly Finder', 'Find dog-friendly restaurants in Bromley. Explore dining near Norman Park.'),
('Beckenham', 'beckenham', 'London', 'Bromley', 'Suburban area with Beckenham Place Park, high street shops, and neighbourhood restaurants.', 'Dog-Friendly Restaurants in Beckenham | Dog Friendly Finder', 'Discover dog-friendly restaurants in Beckenham, near the park.'),
('Orpington', 'orpington', 'London', 'Bromley', 'Outer South East London area with Priory Gardens, local shopping, and family restaurants.', 'Dog-Friendly Restaurants in Orpington | Dog Friendly Finder', 'Browse dog-friendly restaurants in Orpington, Bromley.'),

-- South West London - Sutton
('Sutton', 'sutton', 'London', 'Sutton', 'South West London town with shopping, parks, and local restaurants.', 'Dog-Friendly Restaurants in Sutton | Dog Friendly Finder', 'Find dog-friendly restaurants in Sutton, South West London.')

ON CONFLICT (slug) DO NOTHING;

-- Verify insertion
SELECT COUNT(*) as total_neighbourhoods FROM neighbourhoods;
