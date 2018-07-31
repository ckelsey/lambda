FROM amazonlinux
RUN /bin/bash -c "curl --silent --location https://rpm.nodesource.com/setup_8.x | bash"
RUN /bin/bash -c "yum -y install nodejs"
RUN /bin/bash -c "yum -y install gcc-c++ make"
CMD /bin/bash -c "cd zipS3 && npm i"