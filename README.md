# Lighthouse LWR Perf Tester

This test runner will run against a running LWR app. The idea is to run the app with Locker both enabled and disabled, and then run this test runner against both in order to compare the results.

1. [Install and build the application](https://github.com/tedconn/locker-compiler-perf-234#install-the-project)
2. [Run the app with locker off](https://github.com/tedconn/locker-compiler-perf-234#install-the-project)
3. Install and run this project

```
git clone git@github.com:tedconn/lighthouse-clwr.git

cd lighthouse-clwr
node index.js
```

When it finishes:

4. [Run the app with locker on](https://github.com/tedconn/locker-compiler-perf-234#run-the-test-app-with-locker-enabled)
5. Run this project

```
node index.js
```

All the results (Chrome profiles, Lighthouse reports, CSV file with metrics gathered) are stored in a results/<timestamp> directory. The name of the files and the content of the CSV file show whether Locker was enabled or disabled during the test.
