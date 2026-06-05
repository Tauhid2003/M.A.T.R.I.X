obj-m += matrix_core.o

KERNELRELEASE ?= $(shell uname -r)

all:
	make -C /lib/modules/$(KERNELRELEASE)/build M=$(PWD) modules

clean:
	make -C /lib/modules/$(KERNELRELEASE)/build M=$(PWD) clean
