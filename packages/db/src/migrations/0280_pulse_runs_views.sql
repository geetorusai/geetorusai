CREATE OR REPLACE VIEW "pulse_runs" AS SELECT * FROM "heartbeat_runs";
CREATE OR REPLACE VIEW "pulse_run_events" AS SELECT * FROM "heartbeat_run_events";
CREATE OR REPLACE VIEW "pulse_run_watchdog_decisions" AS SELECT * FROM "heartbeat_run_watchdog_decisions";
