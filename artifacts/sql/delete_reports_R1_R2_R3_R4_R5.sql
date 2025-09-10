-- Delete GPS Reports (Categories R1-R5)
-- Generated: 2025-09-09T17:50:42.897Z
-- WARNING: This script will permanently delete 16 reports
-- Review the IDs carefully before execution

BEGIN;

-- Delete reports in batches of 500
DELETE FROM public."GpsReport" WHERE id IN ('5f4a16ee-b3b9-4b85-b87e-9bb0272a3da2', 'd81f08a2-e4e0-4cde-a8c2-87cc978e2ec1', '225794f5-143b-448b-a872-53b92c997d40', '18590fb0-817f-4cea-bf54-067570c77fb6', 'c5b4c12e-4722-453b-a52d-aa3c09bbf62e', '4946dd36-f116-45e1-a30c-0aada41c775c', '64069ad5-93b3-404c-9feb-5667121a9888', '33adbdac-75bb-4d6f-9e0f-47af7680472f', '9a2cb71b-7564-465d-87c9-9c9d9cbe04e3', 'f9ff239a-f461-4885-b302-67e3f6af1433', '5398b62b-b12e-4136-b754-e475ce0480ef', 'fb115fe6-27f8-4f09-a64e-e8f16ed70da5', 'fd6fba95-3154-413c-8f5c-c30d9f63f450', '38a9daca-7068-4bcc-a12b-590a51322649', 'a1e5df58-6e49-4748-b7ae-3ad8256f54a7', 'd27f434e-5305-49fe-8cbc-c841fcc41a8e');


COMMIT;

-- Verification query (run after execution):
-- SELECT COUNT(*) FROM public."GpsReport" WHERE id IN ('5f4a16ee-b3b9-4b85-b87e-9bb0272a3da2', 'd81f08a2-e4e0-4cde-a8c2-87cc978e2ec1', '225794f5-143b-448b-a872-53b92c997d40', '18590fb0-817f-4cea-bf54-067570c77fb6', 'c5b4c12e-4722-453b-a52d-aa3c09bbf62e');
