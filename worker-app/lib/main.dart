import 'package:flutter/material.dart';
import 'app.dart';
import 'core/time/hotel_time.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  HotelTime.initialize();
  runApp(const WorkerApp());
}
