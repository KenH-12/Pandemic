INSERT INTO GAMEENDCAUSE (description) VALUES ('victory');
INSERT INTO GAMEENDCAUSE (description) VALUES ('outbreak');
INSERT INTO GAMEENDCAUSE (description) VALUES ('cubes');
INSERT INTO GAMEENDCAUSE (description) VALUES ('cards');

-- For each turn, a player does 4 actions...
INSERT INTO STEP (description) VALUES ('action 1');
INSERT INTO STEP (description) VALUES ('action 2');
INSERT INTO STEP (description) VALUES ('action 3');
INSERT INTO STEP (description) VALUES ('action 4');
-- ...draw two player cards...
INSERT INTO STEP (description) VALUES ('draw');
-- ...resolve any epidemics...
-- Resolving an epidemic consists of the following 3 steps:
INSERT INTO STEP (description) VALUES ('epIncrease');
INSERT INTO STEP (description) VALUES ('epInfect');
INSERT INTO STEP (description) VALUES ('epIntensify');
-- ...discard to 7 cards...
INSERT INTO STEP (description) VALUES ('discard');
-- ...and infect cities.
INSERT INTO STEP (description) VALUES ('infect cities');
-- A special step is needed for the "hand limit reached" condition.
-- This step occurs when a player receives an eighth card through the Share Knowledge action.
INSERT INTO STEP (description) VALUES ('hand limit');

INSERT INTO ROLE (roleName, cardText) VALUES ('Contingency Planner', 'As an action, take any discarded Event card and store it on this card.&When you play the stored Event card, remove it from the game.&Limit: 1 Event card on this card at a time, which is not part of your hand.');
INSERT INTO ROLE (roleName, cardText) VALUES ('Dispatcher', 'Move another player''s pawn as if it were yours.&As an action, move any pawn to a city with another pawn.&Get permission before moving another player''s pawn.');
INSERT INTO ROLE (roleName, cardText) VALUES ('Medic', 'Remove all cubes of one color when doing Treat Disease.&Automatically remove cubes of cured diseases from the city you are in (and prevent them from being placed there).');
INSERT INTO ROLE (roleName, cardText) VALUES ('Operations Expert', 'As an action, build a research station in the city you are in (no City card needed).&Once per turn as an action, move from a research station to any city by discarding any City card.');
INSERT INTO ROLE (roleName, cardText) VALUES ('Quarantine Specialist', 'Prevent disease cube placements (and outbreaks) in the city you are in and all cities connected to it.');
INSERT INTO ROLE (roleName, cardText) VALUES ('Researcher', 'You may give any 1 of your City cards when you Share Knowledge. It need not match your city. A player who Shares Knowledge with you on their turn can take any 1 of your City cards.');
INSERT INTO ROLE (roleName, cardText) VALUES ('Scientist', 'You need only 4 cards of the same color to do the Discover a Cure action.');

-- Player hands are treated as card piles, and the cardpile.IDs are parallel to the roleIDs
INSERT INTO CARDPILE (pileName) VALUES ('Contingency Planner');
INSERT INTO CARDPILE (pileName) VALUES ('Dispatcher');
INSERT INTO CARDPILE (pileName) VALUES ('Medic');
INSERT INTO CARDPILE (pileName) VALUES ('Operations Expert');
INSERT INTO CARDPILE (pileName) VALUES ('Quarantine Specialist');
INSERT INTO CARDPILE (pileName) VALUES ('Researcher');
INSERT INTO CARDPILE (pileName) VALUES ('Scientist');
-- Other possible card piles:
INSERT INTO CARDPILE (pileName) VALUES ('deck');
INSERT INTO CARDPILE (pileName) VALUES ('discard');
INSERT INTO CARDPILE (pileName) VALUES ('contingency'); -- Contingency Planner's special ability
INSERT INTO CARDPILE (pileName) VALUES ('removed');

INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('losa', 'y', 4000000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('mexi', 'y', 8851000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('miam', 'y', 463000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('bogo', 'y', 8081000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('lima', 'y', 10000000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('sant', 'y', 5614000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('buen', 'y', 2890000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('saop', 'y', 1211000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('lago', 'y', 21000000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('khar', 'y', 5000000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('kins', 'y', 9464000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('joha', 'y', 957000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('beij', 'r', 21542000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('seou', 'r', 9776000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('shan', 'r', 24183000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('toky', 'r', 9273000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('bang', 'r', 8281000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('hong', 'r', 7392000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('taip', 'r', 2674000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('osak', 'r', 2691000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('jaka', 'r', 9608000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('hoch', 'r', 8445000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('mani', 'r', 1780000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('sydn', 'r', 5131000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('sanf', 'u', 884000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('chic', 'u', 2716000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('mont', 'u', 1705000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('newy', 'u', 8623000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('atla', 'u', 486000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('wash', 'u', 694000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('lond', 'u', 8136000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('esse', 'u', 583000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('stpe', 'u', 4991000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('madr', 'u', 3166000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('pari', 'u', 2200000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('mila', 'u', 1352000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('algi', 'b', 3416000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('ista', 'b', 15030000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('mosc', 'b', 11920000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('cair', 'b', 19500000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('bagh', 'b', 7665000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('tehr', 'b', 8694000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('riya', 'b', 5188000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('kara', 'b', 14910000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('delh', 'b', 18980000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('kolk', 'b', 4497000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('mumb', 'b', 18410000);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('chen', 'b', 7088000);

-- Event cards are player cards and are therefore placed in the CITY table for the logistics of drawing player cards (location.playerCardIndex)
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('resi', 'e', 0);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('oneq', 'e', 0);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('fore', 'e', 0);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('airl', 'e', 0);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('gove', 'e', 0);
-- Epidemics are also player cards. They must exist in CITY to facilitate vw_playerCard.
-- Max 6 epidemics in a game.
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('epi1', 'x', 0);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('epi2', 'x', 0);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('epi3', 'x', 0);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('epi4', 'x', 0);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('epi5', 'x', 0);
INSERT INTO CITY (cityKey, diseaseColor, population) VALUES ('epi6', 'x', 0);

INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('sanf','toky');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('sanf','mani');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('sanf','chic');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('sanf','losa');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('chic','atla');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('chic','mont');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('chic','losa');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('chic','mexi');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('mont','wash');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('mont','newy');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('newy','wash');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('newy','lond');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('newy','madr');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('atla','wash');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('atla','miam');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('wash','miam');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('lond','madr');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('lond','esse');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('lond','pari');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('esse','pari');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('esse','mila');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('esse','stpe');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('stpe','ista');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('stpe','mosc');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('madr','pari');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('madr','algi');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('madr','saop');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('pari','algi');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('pari','mila');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('mila','ista');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('losa','sydn');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('losa','mexi');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('mexi','lima');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('mexi','bogo');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('mexi','miam');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('miam','bogo');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('bogo','lima');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('bogo','saop');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('bogo','buen');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('lima','sant');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('buen','saop');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('saop','lago');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('lago','kins');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('lago','khar');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('khar','kins');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('khar','joha');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('khar','cair');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('kins','joha');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('algi','ista');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('algi','cair');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('ista','mosc');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('ista','bagh');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('ista','cair');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('mosc','tehr');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('cair','bagh');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('cair','riya');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('bagh','riya');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('bagh','kara');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('bagh','tehr');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('tehr','kara');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('tehr','delh');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('riya','kara');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('kara','delh');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('kara','mumb');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('delh','mumb');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('delh','chen');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('delh','kolk');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('kolk','chen');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('kolk','bang');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('kolk','hong');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('mumb','chen');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('chen','bang');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('chen','jaka');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('beij','seou');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('beij','shan');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('seou','shan');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('seou','toky');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('shan','toky');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('shan','taip');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('shan','hong');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('toky','osak');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('bang','hong');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('bang','hoch');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('bang','jaka');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('hong','taip');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('hong','mani');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('hong','hoch');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('taip','osak');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('taip','mani');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('jaka','hoch');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('jaka','sydn');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('hoch','mani');
INSERT INTO CITYCONNECTION (cityKeyA, cityKeyB) VALUES ('mani','sydn');

INSERT INTO DISEASESTATUS (description) VALUES ('rampant');
INSERT INTO DISEASESTATUS (description) VALUES ('cured');
INSERT INTO DISEASESTATUS (description) VALUES ('eradicated');

INSERT INTO user (userName, pass, email) VALUES ('Ken', '', '');
INSERT INTO user (userName, pass, email) VALUES ('Pawandeep', '', '');
INSERT INTO user (userName, pass, email) VALUES ('Joe', '', '');
INSERT INTO user (userName, pass, email) VALUES ('Greg', '', '');
