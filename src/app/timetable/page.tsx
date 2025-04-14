import Layout from "@/components/Layout";
import Timetable from "@/components/Timetable";

const TimetablePage: React.FC = () => {
  return (
    <Layout>
      <div className="h-full">
        <Timetable />
      </div>
    </Layout>
  );
};
export default TimetablePage;
