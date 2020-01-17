#!/bin/bash

keys=$(ffprobe -show_frames -v quiet  -select_streams v  -skip_frame nokey   $1  | grep '^pkt_pts_time' | sed 's/pkt_pts_time=//')
# filename=$2
# num=-1
# prev=0

for i in $keys
	do
			echo $i
done