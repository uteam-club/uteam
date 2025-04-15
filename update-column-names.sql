-- Переименовываем колонки на правильный регистр (CamelCase)
ALTER TABLE players 
RENAME COLUMN passporturl TO "passportUrl";

ALTER TABLE players 
RENAME COLUMN passportfilename TO "passportFileName";

ALTER TABLE players 
RENAME COLUMN passportfilesize TO "passportFileSize";

ALTER TABLE players 
RENAME COLUMN birthcertificateurl TO "birthCertificateUrl";

ALTER TABLE players 
RENAME COLUMN birthcertificatefilename TO "birthCertificateFileName";

ALTER TABLE players 
RENAME COLUMN birthcertificatefilesize TO "birthCertificateFileSize";

ALTER TABLE players 
RENAME COLUMN insuranceurl TO "insuranceUrl";

ALTER TABLE players 
RENAME COLUMN insurancefilename TO "insuranceFileName";

ALTER TABLE players 
RENAME COLUMN insurancefilesize TO "insuranceFileSize"; 