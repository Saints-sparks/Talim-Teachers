export interface StudentContact {
    phoneNumber: string;
    emailAddress: string;
  }
  
  export interface Guardian {
    name: string;
    contactDetails: string;
  }
  
  export interface Parent {
    name: string;
    contactDetails: string;
  }
  export interface Resource {
    id: string
    name: string
    subject: string
    uploadDate: string
    teacherName: string
    type: 'pdf' | 'img' | 'vid' | 'txt'
  }
  
  export interface Student {
    id: string
    fullName: string
    class: string
    studentId: string
    dateOfBirth: string
    gender: string
    status: string
    contact: {
      phoneNumber: string
      emailAddress: string
    }
    father: {
      name: string
      contactDetails: string
    }
    mother: {
      name: string
      contactDetails: string
    }
    guardian: {
      name: string
      contactDetails: string
    }
    imageUrl: string
  }
  
  