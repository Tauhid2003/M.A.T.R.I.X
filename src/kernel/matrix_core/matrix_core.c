#include <linux/module.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/uaccess.h>
#include <linux/jiffies.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("M.A.T.R.I.X OS Team");
MODULE_DESCRIPTION("Core Telemetry Module for M.A.T.R.I.X OS");
MODULE_VERSION("1.0");

#define PROC_NAME "matrix_core"

static unsigned long load_time;
static unsigned long access_count = 0;

static int matrix_core_show(struct seq_file *m, void *v)
{
    unsigned long uptime_ms = jiffies_to_msecs(jiffies - load_time);
    access_count++;
    
    seq_printf(m, "MATRIX_OS_CORE_STATUS=OK\n");
    seq_printf(m, "MODULE_UPTIME_MS=%lu\n", uptime_ms);
    seq_printf(m, "USERSPACE_ACCESS_COUNT=%lu\n", access_count);
    
    return 0;
}

static int matrix_core_open(struct inode *inode, struct file *file)
{
    return single_open(file, matrix_core_show, NULL);
}

// For Linux 5.6+, proc_ops is used instead of file_operations
static const struct proc_ops matrix_proc_ops = {
    .proc_open    = matrix_core_open,
    .proc_read    = seq_read,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};

static int __init matrix_core_init(void)
{
    load_time = jiffies;
    if (!proc_create(PROC_NAME, 0444, NULL, &matrix_proc_ops)) {
        pr_err("matrix_core: Failed to create /proc/%s\n", PROC_NAME);
        return -ENOMEM;
    }
    pr_info("matrix_core: Module loaded successfully.\n");
    return 0;
}

static void __exit matrix_core_exit(void)
{
    remove_proc_entry(PROC_NAME, NULL);
    pr_info("matrix_core: Module unloaded.\n");
}

module_init(matrix_core_init);
module_exit(matrix_core_exit);
