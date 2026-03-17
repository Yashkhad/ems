-- EMS Attendance Management System
-- MySQL Initialization Script
-- This script runs when the MySQL database is first created

-- Note: Database schema is managed by Prisma migrations
-- Run `npx prisma migrate deploy` to apply migrations
-- Run `npx prisma db seed` to seed initial data

-- Create mark_attendance stored procedure for atomic attendance operations
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS mark_attendance(
    IN p_user_id CHAR(36),
    IN p_action VARCHAR(20),
    IN p_is_face_verified BOOLEAN,
    IN p_face_score DECIMAL(5,4),
    IN p_location_data JSON
)
BEGIN
    DECLARE v_today DATE DEFAULT CURRENT_DATE;
    DECLARE v_now DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6);
    DECLARE v_record_id CHAR(36);
    DECLARE v_shift_id CHAR(36);
    DECLARE v_shift_start TIME;
    DECLARE v_shift_end TIME;
    DECLARE v_grace_period INT;
    DECLARE v_status VARCHAR(20);
    DECLARE v_total_hours DECIMAL(5,2);
    DECLARE v_check_in_exists BOOLEAN DEFAULT FALSE;
    
    -- Get user's shift info
    SELECT u.shift_id, s.start_time, s.end_time, s.grace_period_minutes
    INTO v_shift_id, v_shift_start, v_shift_end, v_grace_period
    FROM users u
    LEFT JOIN shifts s ON u.shift_id = s.id
    WHERE u.id = p_user_id;

    -- Check for existing record today
    SELECT id INTO v_record_id
    FROM attendance_records
    WHERE user_id = p_user_id AND date = v_today
    LIMIT 1;

    SET v_check_in_exists = (v_record_id IS NOT NULL);

    IF p_action = 'CHECK_IN' THEN
        -- Check if already checked in
        IF v_check_in_exists THEN
            SELECT JSON_OBJECT(
                'success', FALSE,
                'message', 'Already checked in today'
            ) AS result;
        ELSE
            -- Determine status based on check-in time
            IF v_shift_start IS NOT NULL THEN
                IF TIME(v_now) <= ADDTIME(v_shift_start, SEC_TO_TIME(v_grace_period * 60)) THEN
                    SET v_status = 'PRESENT';
                ELSE
                    SET v_status = 'LATE';
                END IF;
            ELSE
                SET v_status = 'PRESENT';
            END IF;

            -- Insert new record
            INSERT INTO attendance_records (
                id, user_id, date, check_in_time, status, shift_id,
                is_face_verified, face_verification_score, check_in_location, created_at, updated_at
            )
            VALUES (
                UUID(), p_user_id, v_today, v_now, v_status, v_shift_id,
                p_is_face_verified, p_face_score, p_location_data, v_now, v_now
            );

            SELECT JSON_OBJECT(
                'success', TRUE,
                'message', 'Checked in successfully',
                'check_in_time', v_now,
                'status', v_status
            ) AS result;
        END IF;

    ELSEIF p_action = 'CHECK_OUT' THEN
        -- Check if checked in
        IF NOT v_check_in_exists OR v_record_id IS NULL THEN
            SELECT JSON_OBJECT(
                'success', FALSE,
                'message', 'No check-in record found for today'
            ) AS result;
        ELSE
            -- Get check_in_time to calculate total hours
            SELECT TIMESTAMPDIFF(MINUTE, check_in_time, v_now) / 60.0
            INTO v_total_hours
            FROM attendance_records
            WHERE id = v_record_id;

            -- Check if already checked out
            IF EXISTS (SELECT 1 FROM attendance_records WHERE id = v_record_id AND check_out_time IS NOT NULL) THEN
                SELECT JSON_OBJECT(
                    'success', FALSE,
                    'message', 'Already checked out today'
                ) AS result;
            ELSE
                -- Update status based on hours worked
                IF v_total_hours >= 8 THEN
                    SET v_status = 'PRESENT';
                ELSEIF v_total_hours >= 4 THEN
                    SET v_status = 'HALF_DAY';
                ELSE
                    SET v_status = 'HALF_DAY';
                END IF;

                UPDATE attendance_records
                SET check_out_time = v_now,
                    total_hours = ROUND(v_total_hours, 2),
                    status = v_status,
                    check_out_location = p_location_data,
                    updated_at = v_now
                WHERE id = v_record_id;

                SELECT JSON_OBJECT(
                    'success', TRUE,
                    'message', 'Checked out successfully',
                    'check_out_time', v_now,
                    'total_hours', ROUND(v_total_hours, 2),
                    'status', v_status
                ) AS result;
            END IF;
        END IF;
    ELSE
        SELECT JSON_OBJECT(
            'success', FALSE,
            'message', 'Invalid action'
        ) AS result;
    END IF;
END$$

DELIMITER ;

-- Create lock_attendance_for_payroll procedure
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS lock_attendance_for_payroll(
    IN p_locked_by CHAR(36),
    IN p_month INT,
    IN p_year INT
)
BEGIN
    DECLARE v_start_date DATE;
    DECLARE v_end_date DATE;
    DECLARE v_updated_count INT DEFAULT 0;
    
    SET v_start_date = MAKEDATE(p_year, 1);
    SET v_start_date = DATE_ADD(v_start_date, INTERVAL (p_month - 1) MONTH);
    SET v_end_date = LAST_DAY(v_start_date);

    UPDATE attendance_records
    SET is_locked = 1,
        locked_at = CURRENT_TIMESTAMP(6),
        locked_by = p_locked_by
    WHERE date >= v_start_date
      AND date <= v_end_date
      AND is_locked = 0;

    SET v_updated_count = ROW_COUNT();

    SELECT JSON_OBJECT(
        'success', TRUE,
        'message', CONCAT('Locked ', v_updated_count, ' records for ', p_month, '/', p_year),
        'records_locked', v_updated_count,
        'period', JSON_OBJECT('month', p_month, 'year', p_year)
    ) AS result;
END$$

DELIMITER ;

