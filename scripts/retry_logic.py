import sys,time,subprocess
cmd = sys.argv[1:] or ["echo","no-op"]
for i in range(3):
    try:
        subprocess.check_call(cmd)
        sys.exit(0)
    except subprocess.CalledProcessError:
        time.sleep(5)
sys.exit(1)
