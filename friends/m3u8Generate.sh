keys=$(ffprobe -show_frames -v quiet  -select_streams v  -skip_frame nokey   $1  | grep '^pkt_pts_time' | sed 's/pkt_pts_time=//')
filename=$2
num=0
prev=0

echo "#EXTM3U"
echo "#EXT-X-VERSION:3"
echo "#EXT-X-TARGETDURATION:10"
echo "#EXT-X-MEDIA-SEQUENCE:1"

for i in $keys
	do
			duration=$(echo "$i-$prev" | bc)
			echo "#EXTINF:$duration, "
			echo "${filename}$num.ts"
			num=`expr $num + 1`
			#echo "$filename $(echo "$prev*1000" | bc | grep -o '^[0-9]\+').ts"
			prev=$i
done

echo "#EXT-X-ENDLIST"