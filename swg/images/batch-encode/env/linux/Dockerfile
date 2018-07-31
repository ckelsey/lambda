FROM amazonlinux
RUN /bin/bash -c "curl --silent --location https://rpm.nodesource.com/setup_8.x | bash"
RUN /bin/bash -c "yum -y install nodejs"
RUN /bin/bash -c "yum -y install gcc-c++ make"
RUN /bin/bash -c "yum -y install cairo cairo-devel cairomm-devel libjpeg-turbo-devel pango pango-devel pangomm pangomm-devel giflib-devel"
CMD /bin/bash -c "cd lambda-image-encoder/src && npm i"